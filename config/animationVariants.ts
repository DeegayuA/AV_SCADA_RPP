export const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

export const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 150,
            damping: 18,
        },
    },
};

// Hover effects need to be defined where useTheme() is available,
// or passed down as props. Let's pass them down from the main Dashboard.
// So, we will NOT move these specific hover variants here, they stay in the main Dashboard for now.
// const cardHoverEffect = { y: -4, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.08), 0 5px 8px -5px rgba(0, 0, 0, 0.08)", transition: { type: 'spring', stiffness: 350, damping: 20 } };
// const darkCardHoverEffect = { y: -4, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.15), 0 5px 8px -5px rgba(0, 0, 0, 0.2)", transition: { type: 'spring', stiffness: 350, damping: 20 } };
// Update: Okay, let's define *placeholder* hover effects here, but the actual conditional logic based on theme will live in the component using them.
// Or better, let the components just use a generic `whileHover` prop that is determined in the parent.

// Keep variants that are independent of theme in this file:
// export const containerVariants = ...
// export const itemVariants = ...
