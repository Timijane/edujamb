import { HomepageSettings } from "./cms";

export const defaultHomepage: HomepageSettings = {
  global: {
    navAbout: "About",
    navFeatures: "Features",
    navHowItWorks: "How It Works",
    navMission: "Our Mission",
    navLogin: "Log in",
    navStartFree: "Start Free",
    navBlog: "Blog",
    navTagline: "Prepare. Battle. Succeed.",
    heroCaptionLabel: "Your preparation",
    heroCaptionTitle: "Starts with a system.",
    heroTargetScoreLabel: "Target Score",
    heroTargetScore: "300+",
    heroBattleLabel: "JAMB Battle",
    heroBattleTitle: "Ready to compete?",
    heroChecklist: ["Learn", "Practise", "Battle", "Improve"],
    problemEyebrow: "The reality",
    problemTitle:
      "JAMB should not decide your future because you were not properly prepared.",
    problemDescription:
      "Many students do not fail because they cannot learn. They struggle because preparation can be scattered, stressful and difficult to measure. JAMBMASTER brings the important parts of preparation into one connected experience.",
    problemCards: [
      { title: "Learn", text: "with structure" },
      { title: "Practise", text: "with purpose" },
      { title: "Improve", text: "with evidence" },
    ],
    cbtQuestionNumbers: ["18", "19", "20", "21", "22", "23"],
    cbtLiveLabel: "LIVE",
    communityAvatarInitial: "A",
  },

  announcement: {
    enabled: true,
    items: [
      "JAMB preparation starts with the right strategy.",
      "Practice smarter. Improve faster. Build your confidence.",
      "Challenge yourself and compete with other students.",
    ],
    rotationSeconds: 5,
  },

  hero: {
    eyebrow: "THE SMARTER WAY TO PREPARE FOR JAMB",
    title: "Battle JAMB. Overcome Failure. Achieve Your Score.",
    description:
      "JAMBMASTER is a complete preparation platform designed to help every student prepare smarter, practise harder and approach JAMB with confidence — regardless of their current academic level.",
    primaryButtonText: "Start Preparing Free",
    primaryButtonLink: "/signup",
    secondaryButtonText: "Read Blog",
    secondaryButtonLink: "/blog",
    images: [
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
    ],
    imageRotationSeconds: 6,
  },

  about: {
    eyebrow: "WHY JAMBMASTER",
    title:
      "JAMB preparation should not feel like a battle you have to fight alone.",
    description:
      "JAMBMASTER brings learning, practice, competition, analytics, AI guidance and educational support together in one focused platform.",
    secondDescription:
      "From selecting four subjects and setting a target score to studying topics, taking CBTs, battling other students and analyzing performance, every part of the experience is designed around one objective: helping students become better prepared.",
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85",
    points: [
      {
        number: "01",
        title: "Student-first",
        description: "Built around how students actually prepare.",
      },
      {
        number: "02",
        title: "Data-driven",
        description: "Use performance to understand what comes next.",
      },
      {
        number: "03",
        title: "Competitive",
        description: "Turn preparation into healthy competition.",
      },
      {
        number: "04",
        title: "Personal",
        description: "Your subjects, goals, pace and progress matter.",
      },
    ],
    noteLabel: "The goal",
    noteTitle: "Make preparation easier.",
  },

  method: {
    eyebrow: "THE JAMBMASTER METHOD",
    title: "Learn. Practice. Compete. Analyze. Improve.",
    description:
      "Everything is designed around a simple cycle that turns preparation into measurable progress.",
    steps: [
      {
        number: "01",
        title: "Learn",
        text: "Build knowledge through structured subjects, topics, materials, resources and educational videos.",
      },
      {
        number: "02",
        title: "Practise",
        text: "Reinforce what you learn with questions, topic practice and realistic timed CBT experiences.",
      },
      {
        number: "03",
        title: "Compete",
        text: "Challenge yourself against other students and turn preparation into a motivating experience.",
      },
      {
        number: "04",
        title: "Improve",
        text: "Understand your results, identify weak areas and use your data to prepare more intelligently.",
      },
    ],
  },

  features: {
    eyebrow: "ONE PLATFORM. COMPLETE PREPARATION.",
    title: "Everything you need to prepare with confidence.",
    description:
      "From your first lesson to your final mock examination, JAMBMASTER brings your preparation into one connected experience.",
    items: [
      {
        number: "01",
        title: "Personalized Learning",
        description:
          "Build your preparation around the four subjects you actually selected for JAMB. Study topics, resources and materials in a structured learning environment.",
        icon: "book",
      },
      {
        number: "02",
        title: "Real CBT Practice",
        description:
          "Practise with timed computer-based tests designed to help you become familiar with the pressure, speed and discipline required during JAMB.",
        icon: "monitor",
      },
      {
        number: "03",
        title: "JAMB Battle Arena",
        description:
          "Challenge other students in competitive JAMB battles. Compete one-on-one or against groups and see how you perform under pressure.",
        icon: "swords",
      },
      {
        number: "04",
        title: "AI JAMB Coach",
        description:
          "Get intelligent guidance that can explain difficult questions, identify learning gaps, recommend practice and help organize your preparation.",
        icon: "spark",
      },
      {
        number: "05",
        title: "Performance Analytics",
        description:
          "Understand your preparation with performance trends, subject mastery, strengths, weaknesses and recommendations for improvement.",
        icon: "chart",
      },
      {
        number: "06",
        title: "Student Community",
        description:
          "Connect with other JAMB candidates, share achievements, encourage friends, create challenges and become part of a preparation community.",
        icon: "users",
      },
    ],
  },

  learning: {
    eyebrow: "LEARN",
    title: "Understand what you are studying.",
    description:
      "Explore structured subjects, topics, study materials, videos and learning resources built around your JAMB preparation.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
    bullets: [
      "Structured JAMB topics and learning paths",
      "E-textbooks and study resources",
      "Educational videos and materials",
      "Personal study goals and progress",
      "Topic-focused preparation",
    ],
    subjectsLabel: "Your subjects",
    subjects: [
      "Mathematics",
      "English",
      "Physics",
      "Biology",
    ],
  },

  cbt: {
    eyebrow: "PRACTICE",
    title: "Train with realistic CBT experience.",
    description:
      "Take timed computer-based tests, practise under pressure and understand exactly where you need to improve.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
    infoItems: [
      { title: "Timed CBTs" },
      { title: "Topic practice" },
      { title: "Mock examinations" },
      { title: "Instant results" },
      { title: "Question review" },
      { title: "Performance history" },
    ],
    previewTitle: "JAMBMASTER CBT",
    timer: "42:18",
    questionLabel: "QUESTION 18 OF 60",
    question:
      "Which of the following best describes the relationship between...",
    answers: [
      "A. Option one",
      "B. Option two",
      "C. Option three",
      "D. Option four",
    ],
    selectedAnswer: 2,
  },

  battle: {
    eyebrow: "COMPETE",
    title: "Turn preparation into competition.",
    description:
      "Challenge friends and other students in timed battles and see how your performance compares.",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=85",
    tags: [
      "1 vs 1",
      "5 Players",
      "10 Players",
      "20 Players",
      "Leaderboards",
    ],
    boardLabel: "Live battle",
    boardTitle: "JAMB Champions",
    players: [
      {
        position: "01",
        name: "You",
        score: "284",
        active: true,
      },
      {
        position: "02",
        name: "Player 02",
        score: "276",
      },
      {
        position: "03",
        name: "Player 03",
        score: "263",
      },
      {
        position: "04",
        name: "Player 04",
        score: "251",
      },
    ],
    boardFooter: "Compete. Learn. Improve.",
  },

  aiCoach: {
    eyebrow: "AI JAMB COACH",
    title: "Get guidance that understands your preparation.",
    description:
      "Your AI coach can explain difficult questions, identify weaknesses, recommend practice and help you build a smarter study plan.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
    points: [
      { text: "Explain difficult questions" },
      { text: "Recommend practice" },
      { text: "Create study plans" },
      { text: "Identify learning gaps" },
    ],
    assistantName: "JAMB Coach",
    assistantSubtitle: "Your preparation assistant",
    studentMessage:
      "I keep struggling with this topic. What should I do?",
    assistantMessage:
      "Let's break it down. I can explain the concept first, then give you practice questions focused on this area.",
    inputPlaceholder: "Ask your JAMB Coach...",
  },

  analytics: {
    eyebrow: "ANALYZE",
    title: "Know exactly how you are improving.",
    description:
      "Track your performance, subject mastery, strengths, weaknesses, trends and estimated JAMB score.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85",
    points: [
      {
        title: "Subject mastery",
        text: "See how you are performing across your subjects.",
      },
      {
        title: "Weak topics",
        text: "Identify areas that require more attention.",
      },
      {
        title: "Score trends",
        text: "Track how your performance changes over time.",
      },
      {
        title: "Smart recommendations",
        text: "Know what to focus on next.",
      },
    ],
    performanceLabel: "Performance",
    performanceTitle: "Your progress",
    score: "72%",
    scoreLabel: "overall",
    subjects: [
      {
        name: "English",
        value: "82%",
        width: "82%",
      },
      {
        name: "Mathematics",
        value: "74%",
        width: "74%",
      },
      {
        name: "Physics",
        value: "68%",
        width: "68%",
      },
      {
        name: "Biology",
        value: "63%",
        width: "63%",
      },
    ],
  },

  community: {
    eyebrow: "COMMUNITY",
    title:
      "Prepare alongside students who share your ambition.",
    description:
      "Share achievements, encourage others, join study groups, compete with friends and connect with tutors.",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=85",
    sampleName: "Anonymous Student",
    sampleMessage:
      "Just crossed my first 250+ practice score. Let's go!",
    encourageLabel: "♡ Encourage",
    challengeLabel: "⚔ Challenge",
  },

  tutors: {
    eyebrow: "Tutors & live learning",
    title: "Learn with people who can guide you.",
    description:
      "Students can discover tutors, explore tutor profiles, compare learning options, book sessions and participate in private or group live classes.",
    features: [
      { text: "Tutor profiles" },
      { text: "Ratings" },
      { text: "Private lessons" },
      { text: "Live classes" },
    ],
  },

  journey: {
    eyebrow: "Your JAMB journey",
    title: "One preparation journey.\nBuilt around you.",
    description:
      "JAMBMASTER connects each stage of preparation so that students can move forward instead of preparing without knowing what to do next.",
    steps: [
      {
        number: "01",
        title: "Create your student profile",
        text: "Tell JAMBMASTER about your JAMB year, target university, course, target score and academic goals.",
      },
      {
        number: "02",
        title: "Choose your four subjects",
        text: "Your learning environment is organized around the four subjects you will take in JAMB.",
      },
      {
        number: "03",
        title: "Learn your topics",
        text: "Study structured topics using educational materials, resources, videos and guided learning.",
      },
      {
        number: "04",
        title: "Practise continuously",
        text: "Move from learning to questions and timed CBTs until answering becomes faster and more confident.",
      },
      {
        number: "05",
        title: "Battle and compete",
        text: "Challenge other students and use competition as another way to test your knowledge and consistency.",
      },
      {
        number: "06",
        title: "Analyze and improve",
        text: "Use your performance data to discover where you are strong, where you need work and what to study next.",
      },
    ],
  },

  mission: {
    eyebrow: "OUR MISSION",
    title: "We want every student to have a real chance to succeed.",
    description:
      "Your current academic level should not determine your final JAMB result. With the right preparation, consistent practice and meaningful feedback, students can keep improving.",
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85",
    badge: "Battle JAMB. Overcome Failure. Achieve Your Score.",
  },

  finalCta: {
    eyebrow: "Your preparation starts here",
    title: "Your JAMB journey starts here.",
    description:
      "Prepare with purpose. Practice with confidence. Compete with determination.",
    buttonText: "Start Preparing Free",
    buttonLink: "/signup",
  },

  footer: {
    description:
      "Where Excellence Resides. Where Destiny Is Shaped. Where Success Matters.",
    managedBy: "Triangletech",
    copyright: "© 2026 JAMBMASTER. All rights reserved.",
  },
};
