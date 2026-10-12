import { HouseLineIcon, LifebuoyIcon, MapTrifoldIcon, PackageIcon, SignInIcon, SirenIcon } from './icons';

export const PUBLIC_TABS = [
  { href: '/', label: 'ภาพรวม', icon: MapTrifoldIcon, exact: true },
  { href: '/distributions', label: 'แจกจ่าย', icon: PackageIcon },
  { href: '/shelters', label: 'ที่พักพิง', icon: HouseLineIcon },
];

export const PUBLIC_SOS = { href: '/request', label: 'ขอช่วยเหลือ', icon: SirenIcon };

// แท็บขวาสุด: ยังไม่ login → หน้าเข้าสู่ระบบ, login แล้ว → หน้าตามบทบาท
export const PUBLIC_LOGIN = { href: '/login', label: 'เข้าสู่ระบบ', icon: SignInIcon };
export const staffTab = (href) => ({ href, label: 'หน้าเจ้าหน้าที่', icon: LifebuoyIcon });
