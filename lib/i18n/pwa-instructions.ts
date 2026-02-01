/**
 * PWA installation instructions by locale and device
 */

import type { Locale } from './index';

export interface PwaInstructions {
  title: string;
  subtitle: string;
  steps: string[];
  continueButton: string;
  dontShowAgain: string;
}

const iosInstructions: Record<Locale, PwaInstructions> = {
  en: {
    title: 'Install Banha',
    subtitle: 'Add to your home screen for the best experience',
    steps: [
      'Tap the Share button at the bottom of the screen',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" in the top right corner',
    ],
    continueButton: 'Continue to App',
    dontShowAgain: "Don't show again",
  },
  uk: {
    title: 'Встановіть Banha',
    subtitle: 'Додайте на головний екран для кращого досвіду',
    steps: [
      'Натисніть кнопку Поділитися внизу екрану',
      'Прокрутіть вниз і натисніть "На Початковий екран"',
      'Натисніть "Додати" у верхньому правому куті',
    ],
    continueButton: 'Продовжити до додатку',
    dontShowAgain: 'Більше не показувати',
  },
  pt: {
    title: 'Instalar Banha',
    subtitle: 'Adicione ao ecrã inicial para a melhor experiência',
    steps: [
      'Toque no botão Partilhar na parte inferior do ecrã',
      'Deslize para baixo e toque em "Adicionar ao Ecrã Inicial"',
      'Toque em "Adicionar" no canto superior direito',
    ],
    continueButton: 'Continuar para a App',
    dontShowAgain: 'Não mostrar novamente',
  },
};

const androidInstructions: Record<Locale, PwaInstructions> = {
  en: {
    title: 'Install Banha',
    subtitle: 'Add to your home screen for the best experience',
    steps: [
      'Tap the menu button (three dots) in the top right corner',
      'Tap "Install app" or "Add to Home Screen"',
      'Follow the prompts to install',
    ],
    continueButton: 'Continue to App',
    dontShowAgain: "Don't show again",
  },
  uk: {
    title: 'Встановіть Banha',
    subtitle: 'Додайте на головний екран для кращого досвіду',
    steps: [
      'Натисніть кнопку меню (три крапки) у верхньому правому куті',
      'Натисніть "Встановити додаток" або "Додати на головний екран"',
      'Слідуйте підказкам для встановлення',
    ],
    continueButton: 'Продовжити до додатку',
    dontShowAgain: 'Більше не показувати',
  },
  pt: {
    title: 'Instalar Banha',
    subtitle: 'Adicione ao ecrã inicial para a melhor experiência',
    steps: [
      'Toque no botão de menu (três pontos) no canto superior direito',
      'Toque em "Instalar app" ou "Adicionar ao Ecrã Inicial"',
      'Siga as instruções para instalar',
    ],
    continueButton: 'Continuar para a App',
    dontShowAgain: 'Não mostrar novamente',
  },
};

export type DeviceType = 'ios' | 'android' | 'desktop';

export function getPwaInstructions(locale: Locale, device: DeviceType): PwaInstructions {
  if (device === 'ios') {
    return iosInstructions[locale] || iosInstructions.en;
  }
  return androidInstructions[locale] || androidInstructions.en;
}
