import Capacitor
import StoreKit
import UIKit

/// The app's bridge, with LittleNest's own Store plugin registered on it.
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(StorePlugin())
    }
}

/// The one-time unlock, through StoreKit 2. The App Store keeps the purchase
/// with the family's Apple ID: Restore and Family Sharing need no account of ours,
/// and nothing here talks to any server but Apple's.
@objc(StorePlugin)
public class StorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StorePlugin"
    public let jsName = "Store"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "product", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "owned", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "redeemCode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beta", returnType: CAPPluginReturnPromise),
    ]

    private var updates: Task<Void, Never>?

    override public func load() {
        // Purchases that finish outside a tap: Ask to Buy approved later, a code
        // redeemed in the App Store, a Family Sharing grant, or a refund.
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard case .verified(let transaction) = result else { continue }
                await transaction.finish()
                self?.notifyListeners("owned", data: [
                    "productId": transaction.productID,
                    "owned": transaction.revocationDate == nil,
                ])
            }
        }
    }

    deinit {
        updates?.cancel()
    }

    private func productId(_ call: CAPPluginCall) -> String? {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("A product id is needed")
            return nil
        }
        return id
    }

    private func isOwned(_ id: String) async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.productID == id, transaction.revocationDate == nil {
                return true
            }
        }
        return false
    }

    @objc func product(_ call: CAPPluginCall) {
        guard let id = productId(call) else { return }
        Task {
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("Product not found", "NOT_FOUND")
                    return
                }
                call.resolve(["id": product.id, "price": product.displayPrice, "title": product.displayName])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func owned(_ call: CAPPluginCall) {
        guard let id = productId(call) else { return }
        Task {
            let owned = await self.isOwned(id)
            call.resolve(["owned": owned])
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = productId(call) else { return }
        Task {
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("Product not found", "NOT_FOUND")
                    return
                }
                switch try await product.purchase() {
                case .success(let verification):
                    guard case .verified(let transaction) = verification else {
                        call.reject("The App Store could not verify this purchase")
                        return
                    }
                    await transaction.finish()
                    call.resolve(["owned": true])
                case .pending:
                    // Ask to Buy: a parent approves later, and Transaction.updates reports it.
                    call.resolve(["owned": false, "pending": true])
                case .userCancelled:
                    call.resolve(["owned": false, "cancelled": true])
                @unknown default:
                    call.resolve(["owned": false])
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        guard let id = productId(call) else { return }
        Task {
            do {
                try await AppStore.sync()
            } catch {
                // The family may cancel the Apple ID prompt; still report what is on the device.
            }
            let owned = await self.isOwned(id)
            call.resolve(["owned": owned])
        }
    }

    /// Is this the pilot build? Only the "App Pilot" scheme sets LN_PILOT_BUILD=YES
    /// (through LNPilotBuild in Info.plist), so pilot families on TestFlight get
    /// everything free. App Store and App Review builds, Debug builds, and any
    /// other TestFlight build show the paywall. Nothing here looks at the
    /// StoreKit environment: App Review runs in the sandbox too.
    @objc func beta(_ call: CAPPluginCall) {
        let flag = (Bundle.main.object(forInfoDictionaryKey: "LNPilotBuild") as? String ?? "NO").uppercased()
        call.resolve(["beta": flag == "YES"])
    }

    /// Apple's own sheet for an offer code (a school's or a partner's).
    @objc func redeemCode(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard #available(iOS 16.3, *) else {
                call.reject("Codes need iOS 16.3 or later", "UNSUPPORTED")
                return
            }
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else {
                call.reject("No window to show the code sheet")
                return
            }
            do {
                try await AppStore.presentOfferCodeRedeemSheet(in: scene)
                call.resolve()
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }
}
