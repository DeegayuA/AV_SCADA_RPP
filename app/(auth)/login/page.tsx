// app/(auth)/login/page.tsx
'use client';

import { useState, useEffect, useMemo, ForwardRefExoticComponent, RefAttributes, useCallback } from 'react';
import Image, { StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, UseFormReturn } from 'react-hook-form'; // Import UseFormReturn
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, Loader2, AlertCircle, Users, Eye, EyeOff, Sun, Moon, Zap, LucideProps } from 'lucide-react';
import { useTheme } from 'next-themes';

import { isOnboardingComplete } from '@/lib/idb-store';
import { APP_NAME, APP_AUTHOR } from '@/config/constants';
import { AppLogo } from '@/app/onboarding/AppLogo';

import bg1 from "@/img/solar_bg00001.jpg";
import bg2 from "@/img/solar_bg00002.jpg";
import bg3 from "@/img/solar_bg00003.jpg";
import bg4 from "@/img/solar_bg00004.jpg";
import bg5 from "@/img/solar_bg00005.jpg";
import bg6 from "@/img/solar_bg00006.jpg";

const imageUrls: StaticImageData[] = [bg1, bg2, bg3, bg4, bg5, bg6];

const rotatingMessages = [
  { title: "Powering a Greener Tomorrow.", icon: <Zap className="mr-2 inline-block h-6 w-6 text-green-400" /> },
  { title: "Real-time Energy Intelligence.", icon: <Lock className="mr-2 inline-block h-6 w-6 text-blue-400" /> },
  { title: "Seamless Control, Maximum Efficiency.", icon: <Mail className="mr-2 inline-block h-6 w-6 text-purple-400" /> },
  { title: "Visualize Your Energy Ecosystem.", icon: <Eye className="mr-2 inline-block h-6 w-6 text-yellow-400" /> },
];

enum UserRole { ADMIN = 'admin', OPERATOR = 'operator', VIEWER = 'viewer' }
interface User { email: string; passwordHash?: string; role: UserRole; avatar?: string; name: string; redirectPath: string; }
const users: User[] = [
  { email: 'admin@av.lk', passwordHash: 'AVR&D490', role: UserRole.ADMIN, avatar: `https://avatar.vercel.sh/admin-av.png`, name: 'Admin SolarCtrl', redirectPath: '/control' },
  { email: 'operator@av.lk', passwordHash: 'operator123', role: UserRole.OPERATOR, avatar: `https://avatar.vercel.sh/operator-solar.png`, name: 'Operator Prime', redirectPath: '/control' },
  { email: 'viewer@av.lk', passwordHash: 'viewer123', role: UserRole.VIEWER, avatar: `https://avatar.vercel.sh/viewer-energy.png`, name: 'Guest Observer', redirectPath: '/dashboard' },
];

const GoogleIcon = () => (
  <motion.svg whileHover={{ scale: 1.15 }} className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.994,36.076,44,30.54,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </motion.svg>
);

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const columnVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 1, 0.5, 1] } },
};
const imageVariants = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: { opacity: 1, scale: 1, transition: { duration: 1.0, delay: 0.1, ease: [0.25, 1, 0.5, 1] } },
};
const formElementVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" }
  }),
};

type IconType = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
interface FormItemConfigBase { name: "email" | "password"; label: string; placeholder: string; icon: IconType; type: string; }
interface EmailFormItemConfig extends FormItemConfigBase { name: "email"; type: "email"; }
interface PasswordFormItemConfig extends FormItemConfigBase { name: "password"; type: "text" | "password"; rightIcon: IconType; onRightIconClick: () => void; rightIconAriaLabel: string; }
type FormItemConfig = EmailFormItemConfig | PasswordFormItemConfig;


// --- Main LoginPage Component ---
export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  });

  // Define handlers with useCallback BEFORE useMemo if they are dependencies
  const handleLogin = useCallback(async (values: LoginFormValues) => {
    setIsSubmitting(true); setLoginError(null);
    await new Promise(r => setTimeout(r, 1000)); // Simulate network delay
    const user = users.find((u) => u.email.toLowerCase() === values.email.toLowerCase() && u.passwordHash === values.password);
    if (user) {
      toast.success(`Welcome, ${user.name}!`, { description: `Redirecting...`, className: 'dark:bg-green-700/30 dark:border-green-600 dark:text-green-100' });
      localStorage.setItem('user', JSON.stringify({ ...user }));
      router.push(user.redirectPath);
    } else {
      const msg = 'Invalid credentials. Please check email or password.';
      toast.error(msg, { className: 'dark:bg-red-700/30 dark:border-red-600 dark:text-red-100' });
      setLoginError(msg);
      form.setError("root.serverError", { type: "manual", message: msg });
    }
    setIsSubmitting(false);
  }, [router, form]); // form is a dependency if setError is used

  const handleGoogleLogin = useCallback(() => {
    toast("Google Sign-In is a demo feature!", { icon: <GoogleIcon />, action: { label: 'Learn More', onClick: () => console.log('Google SSO learn more') } });
  }, []);

  // Now, useMemo can be called safely as all preceding Hooks are unconditional
  const MemoizedLoginFormContent = useMemo(() =>
    <LoginFormInternalContent
      form={form}
      handleLogin={handleLogin}
      isSubmitting={isSubmitting}
      loginError={loginError}
      handleGoogleLogin={handleGoogleLogin}
    />,
    [form, handleLogin, isSubmitting, loginError, handleGoogleLogin]); // Added handlers to deps array

  useEffect(() => {
    const imageI = setInterval(() => setCurrentImageIndex((p) => (p + 1) % imageUrls.length), 7000);
    const messageI = setInterval(() => setCurrentMessageIndex((p) => (p + 1) % rotatingMessages.length), 5000);
    return () => { clearInterval(imageI); clearInterval(messageI); };
  }, []);

  useEffect(() => {
    const check = async () => {
      const completed = await isOnboardingComplete();
      if (!completed && process.env.NODE_ENV !== 'development') {
        router.replace('/onboarding');
      } else { setIsLoadingPage(false); }
    };
    check();
  }, [router]);

  // Conditional return AFTER all Hooks
  if (isLoadingPage) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-slate-300"
      >
        <AppLogo className="h-20 w-20 mb-6 text-sky-500 animate-pulse" />
        <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
        <p className="mt-4 text-lg tracking-wider">Initializing {APP_NAME}...</p>
      </motion.div>
    );
  }

  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* --- Left Column: Form Area --- */}
      <motion.div
        variants={columnVariants}
        initial="hidden"
        animate="visible"
        className="flex min-h-screen items-center justify-center p-6 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden" // ✅ ensure full screen height and centering
      >
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]">
          {/* Subtle bg pattern */}
        </div>

        <div className="mx-auto flex w-full max-w-md flex-col gap-y-8 z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.5 } }}
            className="flex flex-col items-center text-center" // ✅ always center logo/text
          >
            <AppLogo className="h-12 w-12 mb-3 text-sky-600 dark:text-sky-500" />
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {APP_NAME}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Energy Management. Simplified.
            </p>
          </motion.div>

          <hr className="my-2 border-slate-300 dark:border-slate-700" />

          {MemoizedLoginFormContent}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.0, duration: 0.5 } }}
            className="text-center text-xs text-slate-500 dark:text-slate-500"
          >
            © {new Date().getFullYear()} {APP_AUTHOR}. Empowering Your Energy.
            <div className="mt-1">
              <a
                href="/tos"
                onClick={(e) => {
                  e.preventDefault();
                  // toast.info("Terms demo.");
                }}
                className="hover:text-sky-600 dark:hover:text-sky-500 transition-colors"
              >
                Terms of Service
              </a>{" "}
              |{" "}
              <a
                href="/pp"
                onClick={(e) => {
                  e.preventDefault();
                  // toast.info("Privacy.");
                }}
                className="hover:text-sky-600 dark:hover:text-sky-500 transition-colors"
              >
                Privacy Policy
              </a>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* --- Right Column: Decorative Image & Message --- */}
      <motion.div
        variants={imageVariants} initial="hidden" animate="visible"
        className="relative hidden lg:flex flex-col items-center justify-center bg-slate-800 overflow-hidden"
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1, transition: { duration: 2, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, scale: 1.1, transition: { duration: 1, ease: "easeIn" } }}
            className="absolute inset-0"
          >
            <Image
              src={imageUrls[currentImageIndex]} alt="Solar energy background" fill style={{ objectFit: 'cover' }}
              quality={80} priority={currentImageIndex === 0}
              className="brightness-[0.6] dark:brightness-[0.45] saturate-100 transition-all duration-1000"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/30 via-transparent to-slate-900/50 dark:from-sky-950/50 dark:to-slate-950/70" />
        <div className="relative z-10 text-center p-8 max-w-lg pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessageIndex}
              initial={{ opacity: 0, y: 40, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] } }}
              exit={{ opacity: 0, y: -30, filter: "blur(5px)", transition: { duration: 0.5, ease: "easeIn" } }}
              className="mb-6 flex items-center justify-center text-4xl font-extrabold tracking-tight text-white leading-tight shadow-text-lg" // Ensure .shadow-text-lg is defined in your CSS
            >
              {/* {rotatingMessages[currentMessageIndex].icon} Optional icon display */}
              {rotatingMessages[currentMessageIndex].title}
            </motion.div>
          </AnimatePresence>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.0 } }}
            className="text-lg text-sky-100/80 dark:text-sky-200/70 leading-relaxed shadow-text-md" // Ensure .shadow-text-md is defined
          >
            Access real-time data, analytics, and control features to optimize your solar energy system.
          </motion.p>
        </div>
        <ThemeToggleButton />
      </motion.div>
    </div>
  );
}

// --- Internal LoginFormContent Component (Refactored) ---
function LoginFormInternalContent({
  form, handleLogin, isSubmitting, loginError, handleGoogleLogin
}: {
  form: UseFormReturn<LoginFormValues>; // Correct type for useForm return value
  handleLogin: (values: LoginFormValues) => void;
  isSubmitting: boolean;
  loginError: string | null;
  handleGoogleLogin: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const inputBaseClass = "h-12 text-sm bg-slate-100/50 dark:bg-slate-800/30 border-slate-300/70 dark:border-slate-700/50 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:focus:border-sky-600 dark:focus:ring-sky-600/30 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 ease-in-out";
  const inputWithIconClass = `${inputBaseClass} pl-11`;

  const formItemsConfig: FormItemConfig[] = [
    { name: "email", label: "Email Address", placeholder: "user@example.com", icon: Mail, type: "email" },
    {
      name: "password", label: "Password", placeholder: "Enter your password", icon: Lock,
      type: showPassword ? "text" : "password",
      rightIcon: showPassword ? EyeOff : Eye,
      onRightIconClick: togglePasswordVisibility,
      rightIconAriaLabel: showPassword ? "Hide password" : "Show password"
    },
  ];

  const devCredsAnimationDelayOffset = process.env.NODE_ENV === 'development' ? (users.length * 0.05 + 0.1) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.5, ease: "easeOut" } }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Sign In</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Welcome back! Please enter your details.</p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.4 } }}
          className="rounded-lg border border-sky-500/20 dark:border-sky-600/20 bg-sky-500/5 dark:bg-sky-700/10 p-4 text-xs shadow-sm"
        >
          <p className="mb-3 flex items-center text-sm font-medium text-sky-700 dark:text-sky-300"><Users className="mr-2 h-5 w-5" /> Development Access</p>
          <div className="grid grid-cols-1 gap-2 text-slate-600 dark:text-slate-400">
            {users.map((user, index) => (
              <motion.div
                key={user.email}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.4 + (index * 0.05) } }}
                className="flex items-center justify-between rounded-md border border-slate-300/50 dark:border-slate-700/40 bg-white/30 dark:bg-slate-800/30 px-3 py-1.5 group hover:border-sky-500/50 dark:hover:border-sky-600/50 transition-colors"
              >
                <div className="truncate">
                  <p className="font-semibold text-xs text-slate-700 dark:text-slate-200">{user.name}</p>
                  <p className="text-[11px] truncate">{user.email}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  onClick={() => {
                    form.setValue('email', user.email, { shouldValidate: true });
                    form.setValue('password', user.passwordHash || '', { shouldValidate: true });
                    toast.info(`Credentials for ${user.name} filled.`)
                  }}
                >Fill</Button>
              </motion.div >
            ))}
          </div>
        </motion.div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-5">
          {formItemsConfig.map((item, index) => (
            <motion.div
              key={item.name}
              custom={index + devCredsAnimationDelayOffset}
              initial="hidden" animate="visible" variants={formElementVariants}
            >
              <FormField
                control={form.control}
                name={item.name}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</FormLabel>
                      {item.name === "password" && (<a href="#" onClick={(e) => { e.preventDefault(); toast("Forgot Password demo."); }} className="text-xs text-sky-600 dark:text-sky-500 hover:underline">Forgot Password?</a>)}
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <item.icon className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-sky-600 dark:group-focus-within:text-sky-500 transition-colors" />
                        <Input type={item.type} placeholder={item.placeholder} {...field} className={inputWithIconClass} />
                        {item.name === "password" && (item as PasswordFormItemConfig).rightIcon && (
                          <Button
                            type="button" variant="ghost" size="icon"
                            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-500 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                            onClick={(item as PasswordFormItemConfig).onRightIconClick}
                            aria-label={(item as PasswordFormItemConfig).rightIconAriaLabel}
                          >
                            {/* <{(item as PasswordFormItemConfig).rightIcon} className="h-5 w-5" /> */}
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs pt-1" />
                  </FormItem>
                )}
              />
            </motion.div>
          ))}

          <AnimatePresence>
            {loginError && ( // Show general loginError if set
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center p-3 text-xs rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/50"
              >
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                {loginError}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div custom={formItemsConfig.length + devCredsAnimationDelayOffset} initial="hidden" animate="visible" variants={formElementVariants}>
            <Button
              type="submit"
              className="w-full group text-sm font-semibold h-12 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white shadow-lg hover:shadow-sky-500/30 dark:hover:shadow-sky-500/20 focus-visible:ring-sky-400 dark:focus-visible:ring-sky-300 transition-all duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? (<Loader2 className="h-5 w-5 mr-2 animate-spin" />) : (<LogIn className="h-5 w-5 mr-2 transform transition-transform duration-300 group-hover:translate-x-1" />)}
              Sign In Securely
            </Button>
          </motion.div>
        </form>
      </Form>

      <motion.div
        custom={formItemsConfig.length + 1 + devCredsAnimationDelayOffset} initial="hidden" animate="visible" variants={formElementVariants}
        className="relative my-6"
      >
        <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-300/70 dark:border-slate-700/50" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-slate-50 dark:bg-slate-950 px-2 text-slate-500 dark:text-slate-400 uppercase tracking-wider">Or</span></div>
      </motion.div>

      <motion.div custom={formItemsConfig.length + 2 + devCredsAnimationDelayOffset} initial="hidden" animate="visible" variants={formElementVariants}>
        <Button variant="outline"
          className="w-full group text-sm font-medium h-12 border-slate-300/80 dark:border-slate-700/60 hover:border-sky-500/70 dark:hover:border-sky-500/70 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 transition-all duration-300"
          onClick={handleGoogleLogin}
        ><GoogleIcon />Continue with Google</Button>
      </motion.div>
    </motion.div>
  );
}

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="absolute top-6 right-6 z-20 h-10 w-10 rounded-full bg-black/10 dark:bg-white/5 animate-pulse" />; // Placeholder while not mounted
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 1.2 } }}
      className="absolute top-6 right-6 z-20"
    >
      <Button
        variant="outline" size="icon"
        className="rounded-full bg-black/30 dark:bg-white/10 border-white/20 dark:border-black/20 text-white dark:text-black hover:bg-black/50 dark:hover:bg-white/20 backdrop-blur-sm h-10 w-10"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
      >
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'dark' ?
            <motion.div key="sun" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.2 }}>
              <Sun className="h-5 w-5 text-yellow-400" />
            </motion.div>
            :
            <motion.div key="moon" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.2 }}>
              <Moon className="h-5 w-5 text-sky-500" />
            </motion.div>
          }
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}