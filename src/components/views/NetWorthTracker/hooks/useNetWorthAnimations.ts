import { useSpring, useTransition, useChain, useSpringRef } from 'react-spring';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { springPresets, durations, staggerDelays } from '../utils/animationPresets';
import { NetWorthSummary, AnimationState } from '../types/networth.types';

export const useNetWorthAnimations = (
  summary: NetWorthSummary,
  isLoading: boolean = false,
  hasError: boolean = false
) => {
  // Animation state management
  const [animationState, setAnimationState] = useState<AnimationState>({
    isVisible: false,
    isLoading: false,
    isUpdating: false,
    hasError: false,
    springValues: {
      cashNetWorth: 0,
      totalNetWorth: 0,
      monthlyChange: 0,
    },
  });

  // Previous values for smooth transitions
  const [previousValues, setPreviousValues] = useState({
    cashNetWorth: 0,
    totalNetWorth: 0,
    monthlyChange: 0,
  });

  // Detect value changes
  const hasValuesChanged = useMemo(() => {
    return (
      previousValues.cashNetWorth !== summary.cashNetWorth ||
      previousValues.totalNetWorth !== summary.totalNetWorth ||
      previousValues.monthlyChange !== summary.monthlyChange
    );
  }, [summary, previousValues]);

  // Update previous values when summary changes
  useEffect(() => {
    if (hasValuesChanged) {
      setPreviousValues({
        cashNetWorth: summary.cashNetWorth,
        totalNetWorth: summary.totalNetWorth,
        monthlyChange: summary.monthlyChange,
      });
    }
  }, [summary, hasValuesChanged]);

  // Spring refs for chaining animations
  const numbersRef = useSpringRef();
  const cardsRef = useSpringRef();
  const chartRef = useSpringRef();

  // Main number animations with Apple-smooth transitions
  const numberSprings = useSpring({
    ref: numbersRef,
    config: springPresets.smooth,
    from: {
      cashNetWorth: previousValues.cashNetWorth,
      totalNetWorth: previousValues.totalNetWorth,
      monthlyChange: previousValues.monthlyChange,
      monthlyChangePercent: 0,
    },
    to: {
      cashNetWorth: summary.cashNetWorth,
      totalNetWorth: summary.totalNetWorth,
      monthlyChange: summary.monthlyChange,
      monthlyChangePercent: summary.monthlyChangePercent,
    },
    immediate: !hasValuesChanged,
  });

  // Card entrance animations
  const cardSprings = useSpring({
    ref: cardsRef,
    config: springPresets.gentle,
    from: { 
      opacity: 0, 
      transform: 'translateY(20px) scale(0.95)',
      filter: 'blur(10px)',
    },
    to: { 
      opacity: animationState.isVisible ? 1 : 0,
      transform: animationState.isVisible 
        ? 'translateY(0px) scale(1)' 
        : 'translateY(20px) scale(0.95)',
      filter: animationState.isVisible ? 'blur(0px)' : 'blur(10px)',
    },
  });

  // Chart animation
  const chartSprings = useSpring({
    ref: chartRef,
    config: springPresets.fluid,
    from: { 
      opacity: 0, 
      transform: 'scale(0.9)',
      strokeDashoffset: 1000,
    },
    to: { 
      opacity: animationState.isVisible ? 1 : 0,
      transform: animationState.isVisible ? 'scale(1)' : 'scale(0.9)',
      strokeDashoffset: animationState.isVisible ? 0 : 1000,
    },
  });

  // Loading state animation
  const loadingSprings = useSpring({
    config: springPresets.gentle,
    from: { opacity: 0, transform: 'scale(0.8)' },
    to: { 
      opacity: isLoading ? 1 : 0,
      transform: isLoading ? 'scale(1)' : 'scale(0.8)',
    },
  });

  // Error state animation with gentle shake
  const errorSprings = useSpring({
    config: springPresets.bouncy,
    from: { x: 0, opacity: 0 },
    to: async (next) => {
      if (hasError) {
        await next({ opacity: 1, x: 0 });
        await next({ x: -5 });
        await next({ x: 5 });
        await next({ x: -3 });
        await next({ x: 3 });
        await next({ x: 0 });
      } else {
        await next({ opacity: 0, x: 0 });
      }
    },
  });

  // Success pulse animation for positive changes
  const successPulse = useSpring({
    config: springPresets.bouncy,
    from: { scale: 1, opacity: 0.8 },
    to: async (next) => {
      if (summary.monthlyChange > 0 && hasValuesChanged) {
        await next({ scale: 1.05, opacity: 1 });
        await next({ scale: 1, opacity: 0.8 });
      }
    },
    reset: hasValuesChanged && summary.monthlyChange > 0,
  });

  // Asset list animations
  const assetTransitions = useTransition([], {
    from: { opacity: 0, transform: 'translateX(-20px)' },
    enter: { opacity: 1, transform: 'translateX(0px)' },
    leave: { opacity: 0, transform: 'translateX(20px)' },
    config: springPresets.gentle,
    trail: staggerDelays.assets,
  });

  // Progress bar animation for net worth vs goal
  const progressSpring = useSpring({
    config: springPresets.fluid,
    from: { width: '0%' },
    to: { 
      width: `${Math.min(100, Math.max(0, (summary.totalNetWorth / 1000000) * 100))}%` 
    },
  });

  // Chain animations for entrance sequence
  useChain(
    animationState.isVisible 
      ? [numbersRef, cardsRef, chartRef] 
      : [chartRef, cardsRef, numbersRef],
    animationState.isVisible 
      ? [0, 0.1, 0.2] 
      : [0, 0.05, 0.1]
  );

  // Trigger entrance animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationState(prev => ({ ...prev, isVisible: true }));
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Update animation state based on props
  useEffect(() => {
    setAnimationState(prev => ({
      ...prev,
      isLoading,
      hasError,
      isUpdating: hasValuesChanged,
    }));
  }, [isLoading, hasError, hasValuesChanged]);

  // Utility functions for triggering specific animations
  const triggerSuccessAnimation = useCallback(() => {
    // Trigger a gentle success animation
    setAnimationState(prev => ({
      ...prev,
      isUpdating: true,
    }));

    setTimeout(() => {
      setAnimationState(prev => ({
        ...prev,
        isUpdating: false,
      }));
    }, durations.normal);
  }, []);

  const triggerErrorAnimation = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      hasError: true,
    }));

    setTimeout(() => {
      setAnimationState(prev => ({
        ...prev,
        hasError: false,
      }));
    }, durations.slow);
  }, []);

  // Create animated number formatter
  const createAnimatedFormatter = useCallback((
    springValue: any,
    formatter: (value: number) => string = (val) => val.toLocaleString()
  ) => {
    return springValue.to((value: number) => formatter(value));
  }, []);

  // Create staggered entrance animation for list items
  const createStaggeredEntrance = useCallback((items: any[], delay: number = staggerDelays.items) => {
    return useTransition(items, {
      from: { opacity: 0, transform: 'translateY(10px)' },
      enter: { opacity: 1, transform: 'translateY(0px)' },
      leave: { opacity: 0, transform: 'translateY(-10px)' },
      config: springPresets.gentle,
      trail: delay,
    });
  }, []);

  // Gesture-based animations for mobile
  const createSwipeAnimation = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    const transforms = {
      left: 'translateX(-100px)',
      right: 'translateX(100px)',
      up: 'translateY(-50px)',
      down: 'translateY(50px)',
    };

    return useSpring({
      config: springPresets.snappy,
      from: { opacity: 1, transform: 'translate(0px, 0px)' },
      to: async (next) => {
        await next({ opacity: 0.7, transform: transforms[direction] });
        await next({ opacity: 1, transform: 'translate(0px, 0px)' });
      },
    });
  }, []);

  return {
    // Main animations
    numberSprings,
    cardSprings,
    chartSprings,
    loadingSprings,
    errorSprings,
    successPulse,
    progressSpring,
    
    // Transition animations
    assetTransitions,
    
    // Animation state
    animationState,
    
    // Utility functions
    triggerSuccessAnimation,
    triggerErrorAnimation,
    createAnimatedFormatter,
    createStaggeredEntrance,
    createSwipeAnimation,
    
    // Helper values
    hasValuesChanged,
  };
};