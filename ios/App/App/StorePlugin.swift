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

    /// Is this the pilot build, and where is it running? Only the "App Pilot"
    /// scheme sets LN_PILOT_BUILD=YES (through LNPilotBuild in Info.plist). The
    /// app opens everything only when that flag is on AND StoreKit says the app
    /// came from TestFlight (the sandbox), so a pilot archive that reached the
    /// App Store by mistake still shows the paywall. The environment alone never
    /// opens anything: App Review runs in the sandbox too, with the flag off.
    /// The app (src/purchase/store.ts) makes the decision from these two answers.
    ///
    /// When StoreKit confirms TestFlight, the time is saved in UserDefaults (on
    /// the phone, outside the web view, gone when the app is deleted). A later
    /// launch where StoreKit cannot answer, say offline in a car, sends that
    /// time along, and the app may stand on it. An App Store answer, or a build
    /// without the flag, deletes it.
    @objc func beta(_ call: CAPPluginCall) {
        let flag = (Bundle.main.object(forInfoDictionaryKey: "LNPilotBuild") as? String ?? "NO").uppercased()
        let defaults = UserDefaults.standard
        guard flag == "YES" else {
            // Not a pilot build: nothing more to ask, no StoreKit call, and no saved answer kept.
            defaults.removeObject(forKey: Self.pilotVerifiedKey)
            call.resolve(["pilot": false, "environment": "unknown"])
            return
        }
        Task {
            let environment = await Self.storeEnvironment()
            switch environment {
            case "sandbox", "xcode":
                defaults.set(Date().timeIntervalSince1970, forKey: Self.pilotVerifiedKey)
            case "production":
                defaults.removeObject(forKey: Self.pilotVerifiedKey)
            default:
                break
            }
            var answer: [String: Any] = ["pilot": true, "environment": environment]
            let verified = defaults.double(forKey: Self.pilotVerifiedKey)
            if verified > 0 {
                // Milliseconds, like the app's own clock.
                answer["verifiedAt"] = verified * 1000
            }
            call.resolve(answer)
        }
    }

    /// When StoreKit last confirmed this pilot build came from TestFlight.
    private static let pilotVerifiedKey = "LNPilotVerifiedAt"

    /// Where this copy of the app came from: "sandbox" (TestFlight), "xcode"
    /// (run from Xcode), "production" (the App Store), or "unknown" when
    /// StoreKit cannot say within a few seconds (no connection and nothing
    /// cached). The app decides what "unknown" means; see src/purchase/pilot.ts.
    private static func storeEnvironment() async -> String {
        if #available(iOS 16.0, *) {
            let once = ResumeOnce()
            return await withCheckedContinuation { (continuation: CheckedContinuation<String, Never>) in
                Task {
                    let environment = await Self.appTransactionEnvironment()
                    once.run { continuation.resume(returning: environment) }
                }
                Task {
                    // Offline with nothing cached, StoreKit can wait a long time. Answer "unknown" instead.
                    try? await Task.sleep(nanoseconds: 4_000_000_000)
                    once.run { continuation.resume(returning: "unknown") }
                }
            }
        }
        // iOS 15 has no AppTransaction; a TestFlight install carries a sandbox receipt.
        return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt" ? "sandbox" : "unknown"
    }

    @available(iOS 16.0, *)
    private static func appTransactionEnvironment() async -> String {
        do {
            guard case .verified(let transaction) = try await AppTransaction.shared else { return "unknown" }
            switch transaction.environment {
            case .sandbox: return "sandbox"
            case .xcode: return "xcode"
            case .production: return "production"
            default: return "unknown"
            }
        } catch {
            return "unknown"
        }
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

/// Runs its body the first time only, from any thread: the first of two
/// racing answers resumes the caller, and the other is dropped.
private final class ResumeOnce: @unchecked Sendable {
    private let lock = NSLock()
    private var done = false

    func run(_ body: () -> Void) {
        lock.lock()
        defer { lock.unlock() }
        guard !done else { return }
        done = true
        body()
    }
}
