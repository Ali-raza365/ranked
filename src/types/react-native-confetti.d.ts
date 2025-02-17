declare module 'react-native-confetti' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  interface ConfettiProps extends ViewProps {
    count?: number;
    size?: number;
    duration?: number;
  }

  export default class Confetti extends Component<ConfettiProps> {
    startConfetti(): void;
    stopConfetti(): void;
  }
} 