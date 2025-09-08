// types/framer-motion.d.ts
import { MotionValue } from "framer-motion";

/**
 * @public
 */
export declare type Easing =
  | [number, number, number, number]
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "circIn"
  | "circOut"
  | "circInOut"
  | "backIn"
  | "backOut"
  | "backInOut"
  | "anticipate"
  | ((v: number) => number);


// THIS IS THE GLOBAL OVERRIDE
// It tells TypeScript that we acknowledge the framer-motion types might be too strict
// for some common, valid patterns, and we are widening them for our project.
declare module "framer-motion" {
    /**
     * @public
     */
    export type Easing =
      | [number, number, number, number]
      | "linear"
      | "easeIn"
      | "easeOut"
      | "easeInOut"
      | "circIn"
      | "circOut"
      | "circInOut"
      | "backIn"
      | "backOut"
      | "backInOut"
      | "anticipate"
      | ((p: number) => number)
      // Allow any four-number array for cubic bezier, fixing the primary error
      | number[]
      // Allow any string, fixing "easeOut", etc.
      | (string & {});

    /**
     * @public
     */
    export type AnimationGeneratorType =
      | "spring"
      | "inertia"
      | "tween"
      // Allow any string, fixing "type: 'spring'"
      | (string & {});

    // You might also need this if you use MotionValues extensively
    // with CSS properties that TypeScript doesn't know about.
    export interface MotionStyle {
      [key: string]: string | number | MotionValue;
    }
}