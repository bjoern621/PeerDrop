import "i18next";
import { defaultNS, Translations } from "./resources";

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: typeof defaultNS;
        resources: Translations;
    }
}
