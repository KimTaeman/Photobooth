import { lazy, Suspense, type CSSProperties } from 'react';

const LottiePlayer = lazy(async () => {
  const module = await import('lottie-react');
  return { default: module.default };
});

interface LazyLottieProps {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
  style?: CSSProperties;
}

export default function LazyLottie(props: LazyLottieProps) {
  return (
    <Suspense fallback={<span aria-label="Loading animation" />}>
      <LottiePlayer {...props} />
    </Suspense>
  );
}
