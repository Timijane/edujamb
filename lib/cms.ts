export type HomepageMethodStep = {
  number: string;
  title: string;
  text: string;
};

export type HomepageFeature = {
  number: string;
  title: string;
  description: string;
  icon: string;
};

export type HomepageJourneyStep = {
  number: string;
  title: string;
  text: string;
};

export type HomepageInfoItem = {
  title: string;
};

export type HomepageAiPoint = {
  text: string;
};

export type HomepageProgressPoint = {
  title: string;
  text: string;
};

export type HomepageTutorFeature = {
  text: string;
};

export type HomepageGlobalContent = {
  navAbout: string;
  navFeatures: string;
  navHowItWorks: string;
  navMission: string;
  navLogin: string;
  navStartFree: string;
  navBlog: string;
  navTagline: string;
  heroCaptionLabel: string;
  heroCaptionTitle: string;
  heroTargetScoreLabel: string;
  heroTargetScore: string;
  heroBattleLabel: string;
  heroBattleTitle: string;
  heroChecklist: string[];
  problemEyebrow: string;
  problemTitle: string;
  problemDescription: string;
  problemCards: {
    title: string;
    text: string;
  }[];
  cbtQuestionNumbers: string[];
  cbtLiveLabel: string;
  communityAvatarInitial: string;
};

export type HomepageSettings = {
  global: HomepageGlobalContent;

  announcement: {
    enabled: boolean;
    items: string[];
    rotationSeconds: number;
  };

  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
    images: string[];
    imageMediaIds?: (string | null)[];
    imageRotationSeconds: number;
  };

  about: {
    eyebrow: string;
    title: string;
    description: string;
    secondDescription: string;
    image: string;
    imageMediaId?: string;
    points: {
      number: string;
      title: string;
      description: string;
    }[];
    noteLabel: string;
    noteTitle: string;
  };

  method: {
    eyebrow: string;
    title: string;
    description: string;
    steps: HomepageMethodStep[];
  };

  features: {
    eyebrow: string;
    title: string;
    description: string;
    items: HomepageFeature[];
  };

  learning: {
    eyebrow: string;
    title: string;
    description: string;
    image: string;
    imageMediaId?: string;
    bullets: string[];
    subjectsLabel: string;
    subjects: string[];
  };

  cbt: {
    eyebrow: string;
    title: string;
    description: string;
    image: string;
    imageMediaId?: string;
    infoItems: HomepageInfoItem[];
    previewTitle: string;
    timer: string;
    questionLabel: string;
    question: string;
    answers: string[];
    selectedAnswer: number;
  };

  battle: {
    eyebrow: string;
    title: string;
    description: string;
    image: string;
    imageMediaId?: string;
    tags: string[];
    boardLabel: string;
    boardTitle: string;
    players: {
      position: string;
      name: string;
      score: string;
      active?: boolean;
    }[];
    boardFooter: string;
  };

  aiCoach: {
    eyebrow: string;
    title: string;
    description: string;
    image: string;
    imageMediaId?: string;
    points: HomepageAiPoint[];
    assistantName: string;
    assistantSubtitle: string;
    studentMessage: string;
    assistantMessage: string;
    inputPlaceholder: string;
  };

  analytics: {
    eyebrow: string;
    title: string;
    description: string;
    image: string;
    imageMediaId?: string;
    points: HomepageProgressPoint[];
    performanceLabel: string;
    performanceTitle: string;
    score: string;
    scoreLabel: string;
    subjects: {
      name: string;
      value: string;
      width: string;
    }[];
  };

  community: {
    eyebrow: string;
    title: string;
    description: string;
    image: string;
    imageMediaId?: string;
    sampleName: string;
    sampleMessage: string;
    encourageLabel: string;
    challengeLabel: string;
  };

  tutors: {
    eyebrow: string;
    title: string;
    description: string;
    features: HomepageTutorFeature[];
  };

  journey: {
    eyebrow: string;
    title: string;
    description: string;
    steps: HomepageJourneyStep[];
  };

  mission: {
    eyebrow: string;
    title: string;
    description: string;
    image: string;
    imageMediaId?: string;
    badge: string;
  };

  finalCta: {
    eyebrow: string;
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };

  footer: {
    description: string;
    managedBy: string;
    copyright: string;
  };
};
