import { lazy } from "react";

export const Games = lazy(() => import("../components/Games").then((mod) => ({ default: mod.Games })));

export const AddActivity = lazy(() => import("../components/MathPlay").then((mod) => ({ default: mod.AddActivity })));
export const CountActivity = lazy(() => import("../components/MathPlay").then((mod) => ({ default: mod.CountActivity })));
export const KnowActivity = lazy(() => import("../components/MathPlay").then((mod) => ({ default: mod.KnowActivity })));
export const MoreActivity = lazy(() => import("../components/MathPlay").then((mod) => ({ default: mod.MoreActivity })));
export const ShapeActivity = lazy(() => import("../components/MathPlay").then((mod) => ({ default: mod.ShapeActivity })));
export const TraceActivity = lazy(() => import("../components/MathPlay").then((mod) => ({ default: mod.TraceActivity })));
export const MixActivity = lazy(() => import("../components/ColorPlay").then((mod) => ({ default: mod.MixActivity })));
export const NameActivity = lazy(() => import("../components/ColorPlay").then((mod) => ({ default: mod.NameActivity })));
export const PaintActivity = lazy(() => import("../components/ColorPlay").then((mod) => ({ default: mod.PaintActivity })));
export const ClockActivity = lazy(() => import("../components/TimePlay").then((mod) => ({ default: mod.ClockActivity })));
export const CoinsActivity = lazy(() => import("../components/TimePlay").then((mod) => ({ default: mod.CoinsActivity })));
export const DayActivity = lazy(() => import("../components/TimePlay").then((mod) => ({ default: mod.DayActivity })));
export const EngineerActivity = lazy(() => import("../components/NestBuild").then((mod) => ({ default: mod.EngineerActivity })));
export const RoutineActivity = lazy(() => import("../components/TimePlay").then((mod) => ({ default: mod.RoutineActivity })));
export const ShopActivity = lazy(() => import("../components/TimePlay").then((mod) => ({ default: mod.ShopActivity })));
export const CardsActivity = lazy(() => import("../components/MoneyPlay").then((mod) => ({ default: mod.CardsActivity })));
export const ChooseActivity = lazy(() => import("../components/MoneyPlay").then((mod) => ({ default: mod.ChooseActivity })));
export const JarsActivity = lazy(() => import("../components/MoneyPlay").then((mod) => ({ default: mod.JarsActivity })));
export const LemonadeActivity = lazy(() => import("../components/MoneyPlay").then((mod) => ({ default: mod.LemonadeActivity })));
export const MoneyBoard = lazy(() => import("../components/MoneyPlay").then((mod) => ({ default: mod.MoneyBoard })));
export const NeedsActivity = lazy(() => import("../components/MoneyPlay").then((mod) => ({ default: mod.NeedsActivity })));
