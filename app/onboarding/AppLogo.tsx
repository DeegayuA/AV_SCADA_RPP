import { APP_LOGO } from '@/config/constants';
import { APP_LOGO2 } from '@/config/constants';
import Image from 'next/image';

export const AppLogo = ({ className }: { className?: string }) => (
  <Image src={APP_LOGO} alt="App Logo" className={className || "h-10 w-auto"} />
);

export const AppLogo2 = ({ className }: { className?: string }) => (
  <Image src={APP_LOGO2} alt="App Logo 2" className={className || "h-10 w-auto"} />
);