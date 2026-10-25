/// <reference types="vite/client" />

interface ImportMetaEnv {
 readonly VITE_MEMMARA_WEB_REWARDED_AD_UNIT?:string;
 readonly VITE_MEMMARA_ADMOB_IOS_REWARDED_ID?:string;
 readonly VITE_MEMMARA_ADMOB_IOS_BANNER_ID?:string;
 readonly VITE_MEMMARA_ADMOB_ANDROID_APP_ID?:string;
 readonly VITE_MEMMARA_ADMOB_ANDROID_BANNER_ID?:string;
 readonly VITE_MEMMARA_ADMOB_ANDROID_REWARDED_ID?:string;
 readonly VITE_MEMMARA_ADS_SIMULATE?:string;
}

interface ImportMeta {readonly env:ImportMetaEnv}
