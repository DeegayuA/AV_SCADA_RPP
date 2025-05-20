// app/(auth)/login/page.tsx
'use client';

import { useState, useEffect, useMemo, ForwardRefExoticComponent, RefAttributes, useCallback } from 'react';
import Image, { StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, Loader2, AlertCircle, Users, Eye, EyeOff, Sun, Moon, Zap, LucideProps, Settings2, ShieldCheck, KeyRound } from 'lucide-react'; // Added KeyRound
import { useTheme } from 'next-themes';

import { isOnboardingComplete } from '@/lib/idb-store';
import { APP_NAME, APP_AUTHOR } from '@/config/constants';
import { AppLogo } from '@/app/onboarding/AppLogo';
import { User, UserRole } from '@/types/auth';
import { useAppStore } from '@/stores/appStore'; // Keep this for setting user
import React from 'react';

// Background images
import bg1 from "@/img/solar_bg00001.jpg";
import bg2 from "@/img/solar_bg00002.jpg";
import bg3 from "@/img/solar_bg00003.jpg";
const imageUrls: StaticImageData[] = [bg1, bg2, bg3, bg1, bg2, bg3];


const rotatingMessages = [
  { title: "Empowering Solar Innovations.", iconName: "Zap" },
  { title: "Secure Energy Management.", iconName: "Lock" },
  { title: "Intelligent System Control.", iconName: "Settings2" },
  { title: "Insightful Energy Analytics.", iconName: "Eye" },
];
const iconsMap: { [key: string]: React.ElementType } = { Zap, Lock, Settings2, Eye };


const users: User[] = [
  { email: 'admin@av.lk', passwordHash: 'AVR&D490', role: UserRole.ADMIN, avatar: `https://avatar.vercel.sh/admin-av.png`, name: 'Admin SolarCtrl', redirectPath: '/control' },
  { email: 'operator@av.lk', passwordHash: 'operator123', role: UserRole.OPERATOR, avatar: `https://avatar.vercel.sh/operator-solar.png`, name: 'Operator Prime', redirectPath: '/control' },
  { email: 'viewer@av.lk', passwordHash: 'viewer123', role: UserRole.VIEWER, avatar: `https://avatar.vercel.sh/viewer-energy.png`, name: 'Guest Observer', redirectPath: '/dashboard' },
];

const GoogleIcon = () => ( /* ... Existing GoogleIcon ... */ 
    (<motion.svg whileHover={{ scale: 1.1 }} className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.994,36.076,44,30.54,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </motion.svg>)
);

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const columnVariants = { /* ... */ };
const imageVariants = { /* ... */ };
const formElementVariants = (delayOffset: number = 0) => ({
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: (i * 0.07) + delayOffset + parseFloat(String(0.3)), duration: 0.4, ease: "easeOut" } }),
});
type IconType = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
interface FormItemConfigBase { name: "email" | "password"; label: string; placeholder: string; icon: IconType; type: string; }
interface EmailFormItemConfig extends FormItemConfigBase { name: "email"; type: "email"; }
interface PasswordFormItemConfig extends FormItemConfigBase { name: "password"; type: "text" | "password"; rightIcon: IconType; onRightIconClick: () => void; rightIconAriaLabel: string; }
type FormItemConfig = EmailFormItemConfig | PasswordFormItemConfig;



// Main LoginPage Component
export default function LoginPage() {
  const router = useRouter();
  const setCurrentUserInStore = useAppStore((state) => state.setCurrentUser);
  const directStoreUser = useAppStore((state) => state.currentUser);
  // FIX for Error 1: Access hasHydrated via a selector state
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);

  useEffect(() => {
      // Zustand's persist middleware has a way to subscribe to hydration events.
      // The `onRehydrateStorage` in your appStore.ts is one place, but for component-level
      // knowledge, `useAppStore.persist.hasHydrated()` is the intended synchronous check
      // *after* it has happened. The recommended way for components is to ensure they
      // only render/access persisted state after hydration.
      // For a component, we can set a local state once hydration is true.
      const checkHydration = () => {
        if (useAppStore.persist.hasHydrated()) {
          setIsStoreHydrated(true);
        }
      };
      
      // Check immediately in case it's already hydrated
      checkHydration();

      // Subscribe to changes in hydration status (though `hasHydrated()` is usually checked once)
      const unsubscribe = useAppStore.persist.onHydrate(() => {
          console.log("[LoginPage] Zustand Store Hydrated (onHydrate event)");
          setIsStoreHydrated(true);
      });
      // An alternative or supplement if `onHydrate` doesn't fire as expected in all scenarios:
      // You could also poll `hasHydrated()` briefly or rely on its synchronous value later.
      // A timeout for initial check:
      const timer = setTimeout(() => {
        if (!isStoreHydrated && useAppStore.persist.hasHydrated()) {
          console.log("[LoginPage] Zustand Store Hydrated (timer check)");
          setIsStoreHydrated(true);
        }
      }, 100); // Give it a moment

      return () => {
        unsubscribe();
        clearTimeout(timer);
      };
  }, [isStoreHydrated]); // Re-check `isStoreHydrated` for safety but initial check and onHydrate should cover.

  const [pageState, setPageState] = useState<'loading' | 'onboarding_required' | 'login_form' | 'admin_login_for_setup'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [currentImageIndex, setCurrentImageIndex] = useState(Math.floor(Math.random() * imageUrls.length));
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showAdminPasswordForSetup, setShowAdminPasswordForSetup] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  });
  
  const adminSetupForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  });

    const performLogin = useCallback(async (values: LoginFormValues, isAdminSetupLogin: boolean = false) => {
    // ... (performLogin logic, no change from your latest good version needed for these error fixes) ...
    if (!isAdminSetupLogin && pageState !== 'login_form') {
      toast.error("System Not Ready", { description: "Initial setup may be required by an administrator." });
      return;
    }
    setIsSubmitting(true); setLoginError(null);
    await new Promise(r => setTimeout(r, 800));

    const user = users.find((u) => u.email.toLowerCase() === values.email.toLowerCase() && u.passwordHash === values.password);

    if (user) {
      if (isAdminSetupLogin) {
        if (user.role === UserRole.ADMIN) {
          setCurrentUserInStore(user);
          toast.success(`Admin Verified: ${user.name}!`, { description: "Proceeding to system setup..." });
          setTimeout(() => router.push('/onboarding'), 500);
        } else {
          toast.error("Admin Privileges Required", { description: "Only an administrator can perform the initial setup." });
          adminSetupForm.setError("root.serverError", { message: "This account does not have admin rights." });
        }
      } else { 
        setCurrentUserInStore(user);
        toast.success(`Welcome back, ${user.name}!`, { description: `Signed in as ${user.role}. Redirecting...` });
        setTimeout(() => router.push(user.redirectPath), 500);
      }
    } else {
      const msg = 'Invalid credentials. Please review your email and password.';
      toast.error("Login Failed", { description: msg });
      setLoginError(msg);
      if (isAdminSetupLogin) {
        adminSetupForm.setError("root.serverError", { message: msg });
      } else {
        form.setError("root.serverError", { message: msg });
      }
    }
    setIsSubmitting(false);
  }, [router, setCurrentUserInStore, pageState, form, adminSetupForm]);



  // FIX for Error 2: Move useMemo hook to the top level, before conditional returns
  const MemoizedLoginForm = useMemo(() =>
    <LoginFormInternalContent
      form={form}
      onSubmit={values => performLogin(values, false)}
      isSubmitting={isSubmitting}
      loginError={loginError}
      onGoogleLogin={() => toast.info("Google Sign-In feature under development.")}
    />,
  [form, performLogin, isSubmitting, loginError]); // performLogin needs to be stable (useCallback)

  useEffect(() => {
    if (!isStoreHydrated) { // Use the local state for hydration check
        console.log("[Login Page] Onboarding check: Store not hydrated yet, deferring check.");
        setPageState('loading'); // Keep loading until store is ready
        return;
    }

    const checkOnboardingAndUser = async () => {
      console.log("[Login Page] Onboarding check: Store is hydrated. Current user from store:", directStoreUser);
      setPageState('loading'); // Ensure loading state during async check
      const completed = await isOnboardingComplete();
      console.log("[Login Page] Onboarding Complete Status from IDB:", completed);

      if (!completed) {
        console.log("[Login Page] Onboarding NOT complete.");
        if (directStoreUser && directStoreUser.role === UserRole.ADMIN && directStoreUser.email !== 'guest@example.com') {
            toast.info("Initial Setup Required", { description: "Redirecting you to the setup wizard.", duration: 4000 });
            router.replace('/onboarding');
            return;
        }
        setPageState('onboarding_required');
      } else {
        console.log("[Login Page] Onboarding is complete. Showing login form.");
        setPageState('login_form');
      }
    };

    checkOnboardingAndUser();
  }, [router, isStoreHydrated, directStoreUser]); // Depend on isStoreHydrated local state

  useEffect(() => { /* ... image and message rotation (no change) ... */ 
    const imageI = setInterval(() => setCurrentImageIndex((p) => (p + 1) % imageUrls.length), 7000);
    const messageI = setInterval(() => setCurrentMessageIndex((p) => (p + 1) % rotatingMessages.length), 5500);
    return () => { clearInterval(imageI); clearInterval(messageI); };
  }, []);


  // --- Render Logic ---
  if (pageState === 'loading' || !isStoreHydrated) { // Ensure store is hydrated before rendering anything else
    return (
      /* ... Existing Loading UI ... */
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-neutral-900 text-slate-200 z-50">
        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 150, damping: 12, delay: 0.1 } }}>
            <AppLogo className="h-16 w-16 sm:h-20 sm:w-20 text-primary animate-bounce-slow mb-6" />
        </motion.div>
        <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
        <motion.p initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0, transition:{delay:0.2}}} className="mt-4 text-lg sm:text-xl tracking-wider">
            Initializing {APP_NAME}...
        </motion.p>
      </motion.div>
    );
  }

  if (pageState === 'onboarding_required' || pageState === 'admin_login_for_setup') {
    // ... (Your 'onboarding_required'/'admin_login_for_setup' UI, use performLogin for admin form submit)
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 text-white text-center p-4 sm:p-6 z-50">
            <motion.div 
                initial={{ y: -20, opacity: 0, scale:0.95 }} 
                animate={{ y: 0, opacity: 1, scale:1, transition: { type: 'spring', stiffness: 120, damping: 12, delay: 0.2 } }}
                className="bg-white/10 dark:bg-black/20 p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl backdrop-blur-lg max-w-md lg:max-w-lg w-full">
            <Settings2 className="h-14 w-14 sm:h-16 sm:w-16 mx-auto mb-4 text-sky-300 opacity-90 animate-pulse" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 tracking-tight">Initial System Setup Required</h1>
            <p className="text-xs sm:text-sm text-sky-100/80 max-w-md mx-auto mb-5">
                {APP_NAME} is not yet configured. An administrator must complete the initial setup.
            </p>



            {pageState === 'admin_login_for_setup' ? (
                <Form {...adminSetupForm}>
                <form onSubmit={adminSetupForm.handleSubmit(values => performLogin(values, true))} className="space-y-3 text-left">

                                  {process.env.NODE_ENV === 'development' && (
        <motion.div initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0, transition: { delay: 0.3 } }}
          className="rounded-xl border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-3.5 sm:p-4 text-xs shadow-md">
          <p className="mb-2.5 flex items-center text-sm font-semibold text-primary/90 dark:text-primary/80">
            <Users className="mr-2 h-5 w-5" /> Development Logins
          </p>
          <div className="space-y-2">
            {users.map((user, index) => (
              <motion.div
                key={user.email}
                initial={{ opacity: 0, x: -15 }} 
                animate={{ opacity: 1, x: 0, transition: { delay: 0.3 + (index * 0.05) } }}
                className="flex items-center justify-between rounded-lg border border-slate-300/70 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/50 px-3 py-2.5 group hover:border-primary/70 dark:hover:border-primary/60 transition-all duration-150 shadow-sm hover:shadow-md"
              >
                <div className="truncate mr-2 flex-grow">
                  <p className="font-semibold text-xs text-slate-700 dark:text-slate-200 flex items-center">
                    {user.name} 
                    <span className="ml-1.5 text-[10px] opacity-70 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-sm">
                      {user.role.toUpperCase()}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  {/* DEV FEATURE: Show password */}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center mt-0.5">
                    <KeyRound size={10} className="mr-1 opacity-60"/> {user.passwordHash}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2.5 py-1.5 text-xs text-primary/90 dark:text-primary/80 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-primary/10 rounded-md"
                  onClick={() => {
                    adminSetupForm.setValue('email', user.email, { shouldValidate: true });
                    adminSetupForm.setValue('password', user.passwordHash || '', { shouldValidate: true });
                    toast.info(`Credentials auto-filled for ${user.name}.`, {position: 'top-center'});
                  }}
                >
                  Use
                </Button>
              </motion.div >
            ))}
          </div>
        </motion.div>
      )}
                    {/* ... Admin Email Field ... */}
                     <FormField control={adminSetupForm.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sky-200/80 text-xs font-medium">Admin Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="admin@example.com" {...field} className="bg-white/5 border-sky-300/20 text-white placeholder-sky-200/40 h-10 sm:h-11 focus:bg-white/10 focus:border-sky-300/50 rounded-md text-sm" autoComplete="username"/>
                            </FormControl>
                            <FormMessage className="text-red-300/90 text-xs pt-0.5" />
                        </FormItem>
                    )} />
                    {/* ... Admin Password Field ... */}
                    <FormField control={adminSetupForm.control} name="password" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sky-200/80 text-xs font-medium">Admin Password</FormLabel>
                            <div className="relative">
                            <Input type={showAdminPasswordForSetup ? "text" : "password"} placeholder="Enter admin password" {...field} className="bg-white/5 border-sky-300/20 text-white placeholder-sky-200/40 h-10 sm:h-11 focus:bg-white/10 focus:border-sky-300/50 rounded-md text-sm pr-10" autoComplete="current-password"/>
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-sky-200/60 hover:text-sky-100" onClick={()=>setShowAdminPasswordForSetup(!showAdminPasswordForSetup)}>
                                {showAdminPasswordForSetup ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5"/> : <Eye className="h-4 w-4 sm:h-5 sm:w-5"/>}
                            </Button>
                            </div>
                            <FormMessage className="text-red-300/90 text-xs pt-0.5" />
                        </FormItem>
                    )} />
                    {/* Error Message for Admin Form */}
                    <AnimatePresence>
                    {adminSetupForm.formState.errors.root?.serverError && (
                        <motion.p initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}}
                         className="text-xs text-red-300 bg-red-500/25 p-2 rounded-md flex items-center border border-red-400/50 mt-1!"><AlertCircle size={14} className="mr-1.5"/>{adminSetupForm.formState.errors.root.serverError.message}</motion.p>
                    )}
                    </AnimatePresence>
                    {/* Submit and Cancel Buttons for Admin Form */}
                    <div className="pt-2 space-y-2.5">
                    <Button type="submit" size="lg" className="w-full bg-sky-400 hover:bg-sky-300 text-sky-900 shadow-lg font-semibold group py-2.5 h-auto text-sm rounded-md transition-transform hover:scale-[1.02]">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />} Authenticate & Setup
                    </Button>
                    <Button variant="link" size="sm" onClick={() => {setPageState('onboarding_required'); adminSetupForm.reset(); setLoginError(null);}} className="w-full text-sky-200/70 hover:text-sky-100 text-xs !mt-1.5">
                        Cancel Admin Login
                    </Button>
                    </div>
                </form>
                </Form>
            ) : (
                <>
                    <p className="text-xs text-sky-200/70 mb-4">If you are not an administrator, please ask one to perform the initial system configuration.</p>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { delay: 0.3, type:'spring', stiffness:150 } }}>
                        <Button onClick={() => setPageState('admin_login_for_setup')} size="lg" className="bg-white text-blue-700 hover:bg-sky-100 shadow-xl px-6 py-3 text-sm sm:text-base font-semibold group h-auto rounded-md transition-transform hover:scale-105">
                            Log In as Administrator <ShieldCheck className="ml-2.5 h-5 w-5 transition-transform group-hover:scale-110 text-blue-600"/>
                        </Button>
                    </motion.div>
                </>
            )}
            </motion.div>
        </motion.div>
    );
  }
  
  const RotatingMessageIcon = iconsMap[rotatingMessages[currentMessageIndex].iconName] || Zap;

  // --- Render the main login form if pageState === 'login_form' ---
  return (
    /* ... Your main login form UI from previous response (that uses MemoizedLoginForm)... */
    <div className="grid min-h-svh w-full lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <motion.div variants={columnVariants} initial="hidden" animate="visible" 
         className="flex min-h-screen items-center justify-center p-4 sm:p-8 md:p-10 lg:p-12 relative overflow-hidden" >
        <div className="mx-auto flex w-full max-w-sm sm:max-w-md flex-col gap-y-6 sm:gap-y-8 z-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.5, ease: "circOut" } }}
            className="flex flex-col items-center text-center" >
            <AppLogo className="h-14 w-14 sm:h-16 sm:w-16 mb-3 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100">
              {APP_NAME}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              Smart Energy Management, Simplified for You.
            </p>
          </motion.div>
          <hr className="border-slate-300 dark:border-slate-700/60" />
          {MemoizedLoginForm} 
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.9, duration: 0.5 } }}
            className="text-center text-xs text-slate-500 dark:text-slate-500" >
            © {new Date().getFullYear()} {APP_AUTHOR}. Advanced Solar Solutions.
            <div className="mt-1.5">
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Terms</a> | <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Privacy</a>
            </div>
          </motion.div>
        </div>
      </motion.div>
      <motion.div variants={imageVariants} initial="hidden" animate="visible" 
        className="relative hidden lg:flex flex-col items-center justify-center bg-slate-900 overflow-hidden" >
        <AnimatePresence mode="sync">
          <motion.div key={currentImageIndex} initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1, transition: { duration: 1.8, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.9, ease: "easeIn" } }} className="absolute inset-0" >
            <Image src={imageUrls[currentImageIndex]} alt="Advanced solar panel technology" fill style={{ objectFit: 'cover' }} quality={75} priority={currentImageIndex === 0} className="brightness-[0.55] dark:brightness-[0.4] saturate-100"/>
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/40 via-transparent to-slate-900/60 dark:from-sky-950/60 dark:to-slate-950/80" />
        <div className="relative z-10 text-center p-8 max-w-lg pointer-events-none">
            <motion.div className="mb-6 flex items-center justify-center text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight shadow-text-lg">
                 <AnimatePresence mode="wait">
                    <motion.div key={currentMessageIndex} initial={{ opacity: 0, y: 30, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, delay:0.1, ease: [0.22, 1, 0.36, 1] } }}
                        exit={{ opacity: 0, y: -25, filter: "blur(8px)", transition: { duration: 0.4, ease: "easeIn" } }} className="flex items-center" >
                        <RotatingMessageIcon className="mr-3 inline-block h-7 w-7 sm:h-8 sm:w-8 text-sky-300 opacity-80" />
                        <span>{rotatingMessages[currentMessageIndex].title}</span>
                    </motion.div>
                </AnimatePresence>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.8 } }} className="text-md sm:text-lg text-sky-100/90 dark:text-sky-200/80 leading-relaxed shadow-text-md" >
                Log in to monitor, control, and optimize your solar energy ecosystem with precision and ease.
            </motion.p>
        </div>
        <ThemeToggleButton />
      </motion.div>
    </div>
  );
}


const LoginFormInternalContent = React.memo(({
  form: rhForm, onSubmit, isSubmitting, loginError, onGoogleLogin
}: {
  form: UseFormReturn<LoginFormValues>;
  onSubmit: (values: LoginFormValues) => void;
  isSubmitting: boolean;
  loginError: string | null;
  onGoogleLogin: () => void;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  
  // Recalculate based on number of visible users
  const devUsersCount = process.env.NODE_ENV === 'development' ? users.length : 0;
  const formElementDelayOffset = devUsersCount * 0.03 + (devUsersCount > 0 ? 0.1 : 0) ;

  const inputBaseClass = "h-11 sm:h-12 text-sm bg-slate-100/70 dark:bg-slate-800/50 border-slate-300/80 dark:border-slate-700/70 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:focus:border-primary dark:focus:ring-primary/30 placeholder:text-slate-400/90 dark:placeholder:text-slate-500/80 transition-all duration-200 ease-in-out rounded-lg shadow-sm";
  const inputWithIconClass = `${inputBaseClass} pl-11 sm:pl-12`;

  const formItemsConfig: FormItemConfig[] = [
    { name: "email", label: "Email Address", placeholder: "user@example.com", icon: Mail, type: "email" },
    { name: "password", label: "Password", placeholder: "Your secure password", icon: Lock, type: showPassword ? "text" : "password", rightIcon: showPassword ? EyeOff : Eye, onRightIconClick: togglePasswordVisibility, rightIconAriaLabel: showPassword ? "Hide password" : "Show password" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.5, ease: "circOut" } }}
      className="space-y-5 sm:space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100">Sign In to Your Account</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Access your personalized energy dashboard.</p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <motion.div initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0, transition: { delay: 0.3 } }}
          className="rounded-xl border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-3.5 sm:p-4 text-xs shadow-md">
          <p className="mb-2.5 flex items-center text-sm font-semibold text-primary/90 dark:text-primary/80">
            <Users className="mr-2 h-5 w-5" /> Development Logins
          </p>
          <div className="space-y-2">
            {users.map((user, index) => (
              <motion.div
                key={user.email}
                initial={{ opacity: 0, x: -15 }} 
                animate={{ opacity: 1, x: 0, transition: { delay: 0.3 + (index * 0.05) } }}
                className="flex items-center justify-between rounded-lg border border-slate-300/70 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/50 px-3 py-2.5 group hover:border-primary/70 dark:hover:border-primary/60 transition-all duration-150 shadow-sm hover:shadow-md"
              >
                <div className="truncate mr-2 flex-grow">
                  <p className="font-semibold text-xs text-slate-700 dark:text-slate-200 flex items-center">
                    {user.name} 
                    <span className="ml-1.5 text-[10px] opacity-70 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-sm">
                      {user.role.toUpperCase()}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  {/* DEV FEATURE: Show password */}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center mt-0.5">
                    <KeyRound size={10} className="mr-1 opacity-60"/> {user.passwordHash}
                  </p>
                </div> 
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2.5 py-1.5 text-xs text-primary/90 dark:text-primary/80 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-primary/10 rounded-md"
                  onClick={() => {
                    rhForm.setValue('email', user.email, { shouldValidate: true });
                    rhForm.setValue('password', user.passwordHash || '', { shouldValidate: true });
                    toast.info(`Credentials auto-filled for ${user.name}.`, {position: 'top-center'});
                  }}
                >
                  Use
                </Button>
              </motion.div >
            ))}
          </div>
        </motion.div>
      )}

      <Form {...rhForm}>
        <form onSubmit={rhForm.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
          {formItemsConfig.map((item, index) => (
            <motion.div key={item.name} custom={index} initial="hidden" animate="visible" variants={formElementVariants(formElementDelayOffset)} >
              <FormField control={rhForm.control} name={item.name} render={({ field }) => (
                <FormItem>
                    <div className="flex items-center justify-between mb-1.5">
                      <FormLabel className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.label}</FormLabel>
                      {item.name === "password" && (<a href="#" onClick={(e) => { e.preventDefault(); toast.info("Password recovery feature is currently under development."); }} className="text-xs text-primary hover:underline">Forgot Password?</a>)}
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <item.icon className="absolute left-3.5 sm:left-4 top-1/2 h-4 w-4 sm:h-[18px] sm:w-[18px] -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                        <Input type={item.type} placeholder={item.placeholder} {...field} className={inputWithIconClass} autoComplete={item.name} />
                        {item.name === "password" && 'rightIcon' in item && item.rightIcon && (
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 sm:right-2.5 top-1/2 h-8 w-8 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-transparent focus-visible:ring-0 rounded-full"
                            onClick={(item as PasswordFormItemConfig).onRightIconClick} aria-label={(item as PasswordFormItemConfig).rightIconAriaLabel}>
                            {React.createElement((item as PasswordFormItemConfig).rightIcon, { className: "h-5 w-5" })}
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs pt-1 text-red-600 dark:text-red-500" />
                </FormItem>
              )} />
            </motion.div>
          ))}

          <AnimatePresence>
            {loginError && (
              <motion.div initial={{ opacity: 0, height: 0, y:10 }} animate={{ opacity: 1, height: 'auto', y:0, marginTop: '1.25rem' }} exit={{ opacity: 0, height: 0, y:-10 }} transition={{ type:'spring', stiffness:200, damping:15 }}
                className="flex items-center p-3 text-xs rounded-lg bg-red-500/10 dark:bg-red-700/20 text-red-700 dark:text-red-300 border border-red-500/30 dark:border-red-700/40 shadow-inner">
                <AlertCircle className="h-4 w-4 mr-2.5 flex-shrink-0" />{loginError}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div custom={formItemsConfig.length} initial="hidden" animate="visible" variants={formElementVariants(formElementDelayOffset + 0.1)}>
            <Button type="submit"
              className="w-full group text-sm font-semibold h-11 sm:h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/40 focus-visible:ring-primary/50 transition-all duration-300 ease-out rounded-lg"
              disabled={isSubmitting} >
              {isSubmitting ? (<Loader2 className="h-5 w-5 mr-2.5 animate-spin" />) : (<LogIn className="h-5 w-5 mr-2.5 transform transition-transform duration-200 group-hover:translate-x-0.5 group-hover:scale-105" />)}
              Sign In Securely
            </Button>
          </motion.div>
        </form>
      </Form>

      <motion.div custom={formItemsConfig.length + 1} initial="hidden" animate="visible" variants={formElementVariants(formElementDelayOffset + 0.15)} className="relative my-5 sm:my-6" >
        <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-300/80 dark:border-slate-700/70" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-slate-50 dark:bg-slate-950 px-2.5 text-slate-500 dark:text-slate-400 uppercase tracking-wide">Or</span></div>
      </motion.div>

      <motion.div custom={formItemsConfig.length + 2} initial="hidden" animate="visible" variants={formElementVariants(formElementDelayOffset + 0.2)}>
        <Button variant="outline"
          className="w-full group text-sm font-medium h-11 sm:h-12 border-slate-300/90 dark:border-slate-700/80 hover:border-primary/70 dark:hover:border-primary/60 bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition-all duration-300 ease-out rounded-lg shadow-sm"
          onClick={onGoogleLogin} >
          <GoogleIcon />Continue with Google
        </Button>
      </motion.div>
    </motion.div>
  );
});
LoginFormInternalContent.displayName = 'LoginFormInternalContent';

const ThemeToggleButton = React.memo(() => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20 h-10 w-10 rounded-full bg-black/10 dark:bg-white/5 animate-pulse" />;
  
  const cycleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 1.0, type: 'spring', stiffness:150, damping:12 } }}
      className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20" >
      <Button
        variant="outline" size="icon"
        className="rounded-full bg-black/20 dark:bg-white/10 border-white/10 dark:border-black/10 text-white dark:text-black hover:bg-black/40 dark:hover:bg-white/20 backdrop-blur-md h-10 w-10 sm:h-11 sm:w-11 shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={ theme === 'dark' ? {borderColor:'rgba(255,255,255,0.15)', color: '#f5f5f5'} : {borderColor: 'rgba(0,0,0,0.15)', color:'#0a0a0a'}}
        onClick={cycleTheme} aria-label="Toggle theme" >
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'dark' ?
            <motion.div key="sun-icon" initial={{ y: -12, opacity: 0, rotate: -45 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 12, opacity: 0, rotate: 45 }} transition={{ duration: 0.25, ease: "circOut" }}>
              <Sun className="h-5 w-5 sm:h-[22px] sm:w-[22px] text-yellow-300" />
            </motion.div>
            :
            <motion.div key="moon-icon" initial={{ y: -12, opacity: 0, rotate: 45 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 12, opacity: 0, rotate: -45 }} transition={{ duration: 0.25, ease: "circOut" }}>
              <Moon className="h-5 w-5 sm:h-[22px] sm:w-[22px] text-sky-500" />
            </motion.div>
          }
        </AnimatePresence>
      </Button>
    </motion.div>
  );
});
ThemeToggleButton.displayName = "ThemeToggleButton";