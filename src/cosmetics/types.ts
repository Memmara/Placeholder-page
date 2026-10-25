import type * as THREE from 'three';

export interface CosmeticGear {
 id:string; name:string; category:string; slot:string; rarity:string;
 theme_name?:string; animation_flag?:boolean; set_id?:string|null;
 presentation?:{display_name:string;category:string;display_slot:string;shape_story:string;motion_brief:string;theme_key:string;legacy_name?:string|null;unlock_text?:string;asset_id?:string;palette?:string[]};
}
export type GenderIdentity='male'|'female'|'prefer_not_to_say';
export interface Appearance {skin:string;hair:string;style:string;top:string;eyes:string;eyeShape?:'round'|'soft'|'wide';faceDetail?:'plain'|'freckles'|'rosy';height?:number;gender?:GenderIdentity}
export interface CosmeticAsset {group:THREE.Group; update?:(elapsed:number,motion:boolean)=>void; hides?:string[]}
export interface AvatarBody extends CosmeticAsset {head:THREE.Group;leftArm:THREE.Group;rightArm:THREE.Group}
// Shared character space: floor y=0; soles .12; hips 1.25; chest 2.02;
// shoulders 2.38; neck 2.58; head centre 3.03, scaled 1.09; crown ~3.65. Forward is +Z.
// Wearable/prop builders use this same character space. Companion builders
// return their own floor-centred object; the scene places it beside the avatar.
// Every item has an explicit ID recipe. Portraits render this exact geometry.
