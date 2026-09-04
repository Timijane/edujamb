"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { defaultHomepage } from "@/lib/default-homepage";
import { HomepageSettings } from "@/lib/cms";
import {
  defaultSiteSettings,
  SiteSettings,
} from "@/lib/site-settings";

function mergeHomepage(
  savedData: Partial<HomepageSettings>
): HomepageSettings {
  return {
    ...defaultHomepage,
    ...savedData,

    global: {
      ...defaultHomepage.global,
      ...(savedData.global || {}),
      heroChecklist:
        savedData.global?.heroChecklist ||
        defaultHomepage.global.heroChecklist,
      problemCards:
        savedData.global?.problemCards ||
        defaultHomepage.global.problemCards,
      cbtQuestionNumbers:
        savedData.global?.cbtQuestionNumbers ||
        defaultHomepage.global.cbtQuestionNumbers,
    },

    announcement: {
      ...defaultHomepage.announcement,
      ...(savedData.announcement || {}),
    },

    hero: {
      ...defaultHomepage.hero,
      ...(savedData.hero || {}),
    },

    about: {
      ...defaultHomepage.about,
      ...(savedData.about || {}),
    },

    method: {
      ...defaultHomepage.method,
      ...(savedData.method || {}),
    },

    features: {
      ...defaultHomepage.features,
      ...(savedData.features || {}),
    },

    learning: {
      ...defaultHomepage.learning,
      ...(savedData.learning || {}),
    },

    cbt: {
      ...defaultHomepage.cbt,
      ...(savedData.cbt || {}),
    },

    battle: {
      ...defaultHomepage.battle,
      ...(savedData.battle || {}),
    },

    aiCoach: {
      ...defaultHomepage.aiCoach,
      ...(savedData.aiCoach || {}),
    },

    analytics: {
      ...defaultHomepage.analytics,
      ...(savedData.analytics || {}),
    },

    community: {
      ...defaultHomepage.community,
      ...(savedData.community || {}),
    },

    tutors: {
      ...defaultHomepage.tutors,
      ...(savedData.tutors || {}),
    },

    journey: {
      ...defaultHomepage.journey,
      ...(savedData.journey || {}),
    },

    mission: {
      ...defaultHomepage.mission,
      ...(savedData.mission || {}),
    },

    finalCta: {
      ...defaultHomepage.finalCta,
      ...(savedData.finalCta || {}),
    },

    footer: {
      ...defaultHomepage.footer,
      ...(savedData.footer || {}),
    },
  };
}

export default function Home() {
  const [homepage, setHomepage] =
    useState<HomepageSettings>(defaultHomepage);

  const [siteSettings, setSiteSettings] =
    useState<SiteSettings>(defaultSiteSettings);

  const [loading, setLoading] = useState(true);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [announcementIndex, setAnnouncementIndex] =
    useState(0);

  useEffect(() => {
    async function loadWebsiteConfiguration() {
      try {
        const [homepageSnapshot, siteSnapshot] =
          await Promise.all([
            getDoc(
              doc(
                db,
                "siteSettings",
                "homepage"
              )
            ),
            getDoc(
              doc(
                db,
                "siteSettings",
                "site"
              )
            ),
          ]);

        if (homepageSnapshot.exists()) {
          setHomepage(
            mergeHomepage(
              homepageSnapshot.data() as Partial<HomepageSettings>
            )
          );
        }

        if (siteSnapshot.exists()) {
          setSiteSettings({
            ...defaultSiteSettings,
            ...(siteSnapshot.data() as SiteSettings),
          });
        }
      } catch (error) {
        console.error(
          "Failed to load JAMBMASTER website configuration:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadWebsiteConfiguration();
  }, []);

  const heroImages = useMemo(
    () =>
      [
        homepage.hero.images?.[0] ||
          defaultHomepage.hero.images[0],

        homepage.hero.images?.[1] ||
          defaultHomepage.hero.images[1],

        homepage.hero.images?.[2] ||
          defaultHomepage.hero.images[2],
      ].filter(Boolean),
    [
      homepage.hero.images,
    ]
  );

  const announcementItems = useMemo(
    () =>
      homepage.announcement.items?.filter(
        (item) => item.trim().length > 0
      ) || [],
    [
      homepage.announcement.items,
    ]
  );

  useEffect(() => {
    setHeroImageIndex((current) => {
      if (heroImages.length === 0) {
        return 0;
      }

      return current % heroImages.length;
    });
  }, [heroImages.length]);

  useEffect(() => {
    if (heroImages.length <= 1) {
      return;
    }

    const seconds = Math.max(
      2,
      homepage.hero.imageRotationSeconds || 6
    );

    const interval = window.setInterval(() => {
      setHeroImageIndex((current) =>
        current + 1 >= heroImages.length
          ? 0
          : current + 1
      );
    }, seconds * 1000);

    return () =>
      window.clearInterval(interval);
  }, [
    heroImages.length,
    homepage.hero.imageRotationSeconds,
  ]);

  useEffect(() => {
    if (
      !homepage.announcement.enabled ||
      announcementItems.length <= 1
    ) {
      return;
    }

    const seconds = Math.max(
      2,
      homepage.announcement.rotationSeconds || 5
    );

    const interval = window.setInterval(() => {
      setAnnouncementIndex((current) =>
        current + 1 >= announcementItems.length
          ? 0
          : current + 1
      );
    }, seconds * 1000);

    return () =>
      window.clearInterval(interval);
  }, [
    homepage.announcement.enabled,
    homepage.announcement.rotationSeconds,
    announcementItems.length,
  ]);

  useEffect(() => {
    setAnnouncementIndex((current) => {
      if (announcementItems.length === 0) {
        return 0;
      }

      return current % announcementItems.length;
    });
  }, [announcementItems.length]);

  const currentHeroImage =
    heroImages.length > 0
      ? heroImages[
          heroImageIndex % heroImages.length
        ]
      : defaultHomepage.hero.images[0];

  const announcement =
    announcementItems.length > 0
      ? announcementItems[
          announcementIndex %
            announcementItems.length
        ]
      : "";

  const aboutImage =
    homepage.about.image ||
    defaultHomepage.about.image;

  const learningImage =
    homepage.learning.image ||
    defaultHomepage.learning.image;

  const cbtImage =
    homepage.cbt.image ||
    defaultHomepage.cbt.image;

  const battleImage =
    homepage.battle.image ||
    defaultHomepage.battle.image;

  const aiCoachImage =
    homepage.aiCoach.image ||
    defaultHomepage.aiCoach.image;

  const analyticsImage =
    homepage.analytics.image ||
    defaultHomepage.analytics.image;

  const communityImage =
    homepage.community.image ||
    defaultHomepage.community.image;

  const missionImage =
    homepage.mission.image ||
    defaultHomepage.mission.image;

  const customLogo =
    siteSettings.logo?.trim() || "";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9ff]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-purple-100 border-t-[#6d28d9]" />

          <p className="text-sm font-bold text-[#6d28d9]">
            Loading JAMBMASTER...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="overflow-hidden bg-[#faf9ff] text-[#171321]">
      {/* ANNOUNCEMENT */}
      {homepage.announcement.enabled &&
        announcement && (
          <div className="relative z-[60] overflow-hidden bg-[#24113f] text-white">
            <div className="announcement-track">
              <div className="mx-auto flex min-h-[38px] max-w-7xl items-center justify-center px-5 text-center">
                <div className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
                  <span className="status-dot" />

                  <span
                    key={`${announcementIndex}-${announcement}`}
                    className="announcement-message"
                  >
                    {announcement}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* NAVIGATION */}
      <header className="site-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a
            href="/"
            className="flex items-center gap-3"
          >
            {customLogo ? (
              <img
                src={customLogo}
                alt="JAMBMASTER"
                className="h-12 w-auto max-w-[190px] object-contain"
              />
            ) : (
              <div className="logo-placeholder">
                LOGO
              </div>
            )}

            <div>
              <div className="text-xl font-black tracking-tight text-[#24113f]">
                JAMB
                <span className="text-[#7c3aed]">
                  MASTER
                </span>
              </div>

              <div className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-[#81778e] sm:block">
                {homepage.global.navTagline}
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#62586e] lg:flex">
            <a href="#about" className="nav-link">
              {homepage.global.navAbout}
            </a>

            <a href="#features" className="nav-link">
              {homepage.global.navFeatures}
            </a>

            <a href="#journey" className="nav-link">
              {homepage.global.navHowItWorks}
            </a>

            <a href="#mission" className="nav-link">
              {homepage.global.navMission}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/login"
              className="rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/15 transition hover:-translate-y-0.5 hover:bg-[#5b21b6] sm:px-5"
            >
              {homepage.global.navStartFree}
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero-section relative">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-28">
          <div className="relative z-10 fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#6d28d9] shadow-sm backdrop-blur">
              <span className="status-dot" />
              {homepage.hero.eyebrow}
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-[#21132f] sm:text-6xl lg:text-[76px]">
              {formatHeroTitle(
                homepage.hero.title
              )}
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-[#675d72] sm:text-lg sm:leading-8">
              {homepage.hero.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={homepage.hero.primaryButtonLink}
                className="primary-button group"
              >
                {homepage.hero.primaryButtonText}

                <span className="button-arrow">
                  →
                </span>
              </a>

              <a
                href={homepage.hero.secondaryButtonLink}
                className="secondary-button"
              >
                {homepage.hero.secondaryButtonText}
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-[#6c6278]">
              {homepage.global.heroChecklist.map((item, index) => (
                <div key={`${item}-${index}`} className="flex items-center gap-2">
                  <span className="check-circle">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[570px] lg:ml-auto fade-up delay-one">
            <div className="hero-image-wrap">
              <img
                key={currentHeroImage}
                src={currentHeroImage}
                alt="Students preparing for JAMB"
                className="hero-image hero-image-fade"
              />

              <div className="hero-image-overlay" />

              <div className="hero-caption">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                  {homepage.global.heroCaptionLabel}
                </div>

                <div className="mt-1 text-xl font-black text-white">
                  {homepage.global.heroCaptionTitle}
                </div>
              </div>

              {heroImages.length > 1 && (
                <div className="absolute bottom-5 right-5 z-20 flex gap-1.5">
                  {heroImages.map(
                    (_, index) => (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Show hero image ${
                          index + 1
                        }`}
                        onClick={() =>
                          setHeroImageIndex(index)
                        }
                        className={`h-1.5 rounded-full transition-all ${
                          index ===
                          heroImageIndex
                            ? "w-7 bg-white"
                            : "w-2 bg-white/45"
                        }`}
                      />
                    )
                  )}
                </div>
              )}
            </div>

            <div className="floating-card floating-score">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#83768f]">
                    {homepage.global.heroTargetScoreLabel}
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#261532]">
                    {homepage.global.heroTargetScore}
                  </p>
                </div>

                <div className="score-ring">
                  <span>↑</span>
                </div>
              </div>
            </div>

            <div className="floating-card floating-battle">
              <div className="flex items-center gap-3">
                <div className="battle-icon">
                  ⚔
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#83768f]">
                    {homepage.global.heroBattleLabel}
                  </p>

                  <p className="mt-0.5 text-sm font-black text-[#261532]">
                    {homepage.global.heroBattleTitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="hero-decoration">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="bg-[#21132f] px-5 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="section-eyebrow section-eyebrow-light">
                {homepage.global.problemEyebrow}
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                {homepage.global.problemTitle}
              </h2>
            </div>

            <div>
              <p className="max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
                {homepage.global.problemDescription}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {homepage.global.problemCards.map((card, index) => (
                  <div className="dark-mini-card" key={`${card.title}-${index}`}>
                    <strong>{card.title}</strong>
                    <span>{card.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="relative">
              <div className="about-image-frame">
                <img
                  src={aboutImage}
                  alt="Students learning together"
                  className="about-image"
                />
              </div>

              <div className="about-note">
                <span className="about-note-icon">
                  ★
                </span>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#81758d]">
                    {homepage.about.noteLabel}
                  </p>

                  <p className="mt-1 font-black text-[#291638]">
                    {homepage.about.noteTitle}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="section-eyebrow">
                {homepage.about.eyebrow}
              </p>

              <h2 className="section-title">
                {homepage.about.title}
              </h2>

              <p className="section-copy">
                {homepage.about.description}
              </p>

              <p className="section-copy">
                {homepage.about.secondDescription}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {homepage.about.points.map(
                  (point) => (
                    <div
                      key={point.number}
                      className="about-point"
                    >
                      <span>{point.number}</span>

                      <div>
                        <strong>
                          {point.title}
                        </strong>

                        <p>
                          {point.description}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METHOD */}
      <section className="method-section px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-eyebrow">
              {homepage.method.eyebrow}
            </p>

            <h2 className="section-title">
              {homepage.method.title}
            </h2>

            <p className="section-copy mx-auto">
              {homepage.method.description}
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {homepage.method.steps.map(
              (step) => (
                <MethodCard
                  key={step.number}
                  number={step.number}
                  title={step.title}
                  text={step.text}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="px-5 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="section-eyebrow">
              {homepage.features.eyebrow}
            </p>

            <h2 className="section-title">
              {homepage.features.title}
            </h2>

            <p className="section-copy">
              {homepage.features.description}
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {homepage.features.items.map(
              (feature) => (
                <FeatureCard
                  key={feature.number}
                  number={feature.number}
                  title={feature.title}
                  description={
                    feature.description
                  }
                  icon={feature.icon}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* LEARNING */}
      <section className="feature-showcase px-5 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="section-eyebrow">
              {homepage.learning.eyebrow}
            </p>

            <h2 className="section-title">
              {homepage.learning.title}
            </h2>

            <p className="section-copy">
              {homepage.learning.description}
            </p>

            <ul className="feature-list">
              {homepage.learning.bullets.map(
                (bullet, index) => (
                  <li key={`${bullet}-${index}`}>
                    {bullet}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="order-1 lg:order-2">
            <div className="feature-image-card">
              <img
                src={learningImage}
                alt="Student studying on a laptop"
                className="feature-image"
              />

              <div className="subject-panel">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a7d96]">
                  {homepage.learning.subjectsLabel}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {homepage.learning.subjects.map(
                    (subject) => (
                      <span key={subject}>
                        {subject}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CBT */}
      <section className="px-5 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="cbt-preview">
              <div className="cbt-top">
                <span>
                  {homepage.cbt.previewTitle}
                </span>

                <span className="timer-pill">
                  {homepage.cbt.timer}
                </span>
              </div>

              <div className="cbt-body">
                <div className="cbt-question">
                  <span>
                    {homepage.cbt.questionLabel}
                  </span>

                  <h3>
                    {homepage.cbt.question}
                  </h3>

                  <div className="answers">
                    {homepage.cbt.answers.map(
                      (answer, index) => (
                        <div
                          key={`${answer}-${index}`}
                          className={
                            index ===
                            homepage.cbt.selectedAnswer
                              ? "answer-selected"
                              : ""
                          }
                        >
                          {answer}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="question-map">
                  {homepage.global.cbtQuestionNumbers.map((number, index) => (
                    <span key={`${number}-${index}`} className={index === 0 ? "active" : ""}>
                      {number}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="section-eyebrow">
              {homepage.cbt.eyebrow}
            </p>

            <h2 className="section-title">
              {homepage.cbt.title}
            </h2>

            <p className="section-copy">
              {homepage.cbt.description}
            </p>

            <div className="info-grid">
              {homepage.cbt.infoItems.map(
                (item, index) => (
                  <InfoItem
                    key={`${item.title}-${index}`}
                    title={item.title}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* BATTLE */}
      <section
        id="battles"
        className="battle-section px-5 py-20 text-white sm:py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="section-eyebrow section-eyebrow-gold">
              {homepage.battle.eyebrow}
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              {homepage.battle.title}
            </h2>

            <p className="mt-6 max-w-xl text-base leading-8 text-white/65 sm:text-lg">
              {homepage.battle.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {homepage.battle.tags.map(
                (tag) => (
                  <span
                    key={tag}
                    className="battle-tag"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="battle-board">
            <div className="battle-board-header">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/45">
                  {homepage.battle.boardLabel}
                </p>

                <h3 className="mt-1 text-xl font-black">
                  {homepage.battle.boardTitle}
                </h3>
              </div>

              <div className="live-pill">
                <span />
                {homepage.global.cbtLiveLabel}
              </div>
            </div>

            {homepage.battle.players.map(
              (player) => (
                <BattleRow
                  key={player.position}
                  position={player.position}
                  name={player.name}
                  score={player.score}
                  active={player.active}
                />
              )
            )}

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-center text-xs font-semibold text-white/50">
              {homepage.battle.boardFooter}
            </div>
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="ai-card">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="section-eyebrow">
                  {homepage.aiCoach.eyebrow}
                </p>

                <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-[#241331] sm:text-5xl">
                  {homepage.aiCoach.title}
                </h2>

                <p className="mt-6 max-w-xl text-base leading-8 text-[#6d6275]">
                  {homepage.aiCoach.description}
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {homepage.aiCoach.points.map(
                    (point, index) => (
                      <AiPoint
                        key={`${point.text}-${index}`}
                        text={point.text}
                      />
                    )
                  )}
                </div>
              </div>

              <div className="ai-chat">
                <div className="ai-chat-header">
                  <div className="ai-avatar">
                    AI
                  </div>

                  <div>
                    <p className="font-black text-[#291638]">
                      {homepage.aiCoach.assistantName}
                    </p>

                    <p className="text-xs text-[#8b7f91]">
                      {homepage.aiCoach.assistantSubtitle}
                    </p>
                  </div>
                </div>

                <div className="chat-message student-message">
                  {homepage.aiCoach.studentMessage}
                </div>

                <div className="chat-message ai-message">
                  {homepage.aiCoach.assistantMessage}
                </div>

                <div className="chat-input">
                  <span>
                    {homepage.aiCoach.inputPlaceholder}
                  </span>

                  <b>→</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section className="analytics-section px-5 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="section-eyebrow">
              {homepage.analytics.eyebrow}
            </p>

            <h2 className="section-title">
              {homepage.analytics.title}
            </h2>

            <p className="section-copy">
              {homepage.analytics.description}
            </p>

            <div className="mt-8 space-y-3">
              {homepage.analytics.points.map(
                (point, index) => (
                  <ProgressPoint
                    key={`${point.title}-${index}`}
                    title={point.title}
                    text={point.text}
                  />
                )
              )}
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-header">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#8b7e95]">
                  {homepage.analytics.performanceLabel}
                </p>

                <h3 className="mt-1 text-2xl font-black text-[#251431]">
                  {homepage.analytics.performanceTitle}
                </h3>
              </div>

              <div className="score-number">
                <strong>
                  {homepage.analytics.score}
                </strong>

                <span>
                  {homepage.analytics.scoreLabel}
                </span>
              </div>
            </div>

            <div className="chart">
              <div className="chart-line">
                <span className="chart-point point-one" />
                <span className="chart-point point-two" />
                <span className="chart-point point-three" />
                <span className="chart-point point-four" />
                <span className="chart-point point-five" />
              </div>
            </div>

            <div className="analytics-subjects">
              {homepage.analytics.subjects.map(
                (subject) => (
                  <SubjectBar
                    key={subject.name}
                    name={subject.name}
                    value={subject.value}
                    width={subject.width}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* COMMUNITY + TUTORS */}
      <section className="px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="community-card">
              <div className="card-icon purple-icon">
                ◎
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.15em] text-[#7c3aed]">
                {homepage.community.eyebrow}
              </p>

              <h3 className="mt-3 text-3xl font-black tracking-tight text-[#251431]">
                {homepage.community.title}
              </h3>

              <p className="mt-4 leading-7 text-[#71667b]">
                {homepage.community.description}
              </p>

              <div className="community-post mt-8">
                <div className="community-avatar">
                  {homepage.global.communityAvatarInitial}
                </div>

                <div>
                  <p className="text-sm font-black text-[#33213e]">
                    {homepage.community.sampleName}
                  </p>

                  <p className="mt-1 text-sm text-[#71667b]">
                    {homepage.community.sampleMessage}
                  </p>

                  <div className="mt-3 flex gap-4 text-xs font-bold text-[#8b7f92]">
                    <span>
                      {homepage.community.encourageLabel}
                    </span>

                    <span>
                      {homepage.community.challengeLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="tutor-card">
              <div className="card-icon gold-icon">
                ✦
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.15em] text-[#a16207]">
                {homepage.tutors.eyebrow}
              </p>

              <h3 className="mt-3 text-3xl font-black tracking-tight text-[#251431]">
                {homepage.tutors.title}
              </h3>

              <p className="mt-4 leading-7 text-[#71667b]">
                {homepage.tutors.description}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {homepage.tutors.features.map(
                  (feature) => (
                    <TutorFeature
                      key={feature.text}
                      text={feature.text}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section
        id="journey"
        className="journey-section px-5 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-eyebrow">
              {homepage.journey.eyebrow}
            </p>

            <h2 className="section-title whitespace-pre-line">
              {homepage.journey.title}
            </h2>

            <p className="section-copy mx-auto">
              {homepage.journey.description}
            </p>
          </div>

          <div className="journey-grid mt-14">
            {homepage.journey.steps.map(
              (item) => (
                <div
                  key={item.number}
                  className="journey-item"
                >
                  <div className="journey-number">
                    {item.number}
                  </div>

                  <div>
                    <h3>{item.title}</h3>

                    <p>{item.text}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section
        id="mission"
        className="mission-section px-5 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-5xl text-center">
          <p className="section-eyebrow section-eyebrow-gold">
            {homepage.mission.eyebrow}
          </p>

          <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            {homepage.mission.title}
          </h2>

          <p className="mx-auto mt-7 max-w-3xl text-base leading-8 text-white/65 sm:text-lg">
            {homepage.mission.description}
          </p>

          <div className="mt-10 inline-flex rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white/80 backdrop-blur">
            {homepage.mission.badge}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 py-20 sm:py-28">
        <div className="final-cta mx-auto max-w-6xl">
          <div className="relative z-10 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#facc15]">
              {homepage.finalCta.eyebrow}
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
              {homepage.finalCta.title}
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              {homepage.finalCta.description}
            </p>

            <a
              href={homepage.finalCta.buttonLink}
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-4 font-black text-[#5b21b6] transition hover:-translate-y-1"
            >
              {homepage.finalCta.buttonText}

              <span>→</span>
            </a>
          </div>

          <div className="cta-shape cta-shape-one" />
          <div className="cta-shape cta-shape-two" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#e9e4ee] bg-white px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {customLogo ? (
              <img
                src={customLogo}
                alt="JAMBMASTER"
                className="h-12 w-auto max-w-[190px] object-contain"
              />
            ) : (
              <div className="text-xl font-black tracking-tight text-[#24113f]">
                JAMB
                <span className="text-[#7c3aed]">
                  MASTER
                </span>
              </div>
            )}

            <p className="mt-2 max-w-xl text-sm text-[#81778e]">
              {homepage.footer.description}
            </p>

            <p className="mt-3 text-xs font-bold text-[#7c3aed]">
              Managed by{" "}
              {homepage.footer.managedBy}
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-sm font-semibold text-[#706579]">
            <a href="#about" className="footer-link">
              {homepage.global.navAbout}
            </a>

            <a href="#features" className="footer-link">
              {homepage.global.navFeatures}
            </a>

            <a href="#journey" className="footer-link">
              {homepage.global.navHowItWorks}
            </a>

            <a href="/blog" className="footer-link">
              {homepage.global.navBlog}
            </a>

            <a href="/login" className="footer-link">
              {homepage.global.navLogin}
            </a>

            <a href="/login" className="footer-link">
              {homepage.global.navStartFree}
            </a>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-[#eeeaf1] pt-6 text-xs text-[#9b92a3]">
          {homepage.footer.copyright}
        </div>
      </footer>
    </main>
  );
}

function formatHeroTitle(title: string) {
  const parts = title.split("\n");

  if (parts.length === 1) {
    return title;
  }

  return parts.map((part, index) => (
    <span
      key={`${part}-${index}`}
      className="block"
    >
      {index === 1 ? (
        <span className="gradient-text">
          {part}
        </span>
      ) : (
        part
      )}
    </span>
  ));
}

function MethodCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="method-card">
      <div className="method-number">
        {number}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

function FeatureCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="feature-card">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`feature-icon icon-${icon}`}
        >
          {icon === "book" && "▣"}
          {icon === "monitor" && "▤"}
          {icon === "swords" && "⚔"}
          {icon === "spark" && "✦"}
          {icon === "chart" && "↗"}
          {icon === "users" && "◎"}
        </div>

        <span className="feature-number">
          {number}
        </span>
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <div className="feature-line" />
    </div>
  );
}

function InfoItem({
  title,
}: {
  title: string;
}) {
  return (
    <div className="info-item">
      <span>✓</span>
      {title}
    </div>
  );
}

function BattleRow({
  position,
  name,
  score,
  active = false,
}: {
  position: string;
  name: string;
  score: string;
  active?: boolean;
}) {
  return (
    <div
      className={`battle-row ${
        active ? "battle-row-active" : ""
      }`}
    >
      <span className="battle-position">
        {position}
      </span>

      <div className="battle-player">
        <div className="player-avatar">
          {name.charAt(0)}
        </div>

        <span>{name}</span>
      </div>

      <strong>{score}</strong>
    </div>
  );
}

function AiPoint({
  text,
}: {
  text: string;
}) {
  return (
    <div className="ai-point">
      <span>✓</span>
      {text}
    </div>
  );
}

function ProgressPoint({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="progress-point">
      <span>✓</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function SubjectBar({
  name,
  value,
  width,
}: {
  name: string;
  value: string;
  width: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-bold">
        <span className="text-[#5f5469]">
          {name}
        </span>

        <span className="text-[#7c3aed]">
          {value}
        </span>
      </div>

      <div className="subject-track">
        <div
          className="subject-fill"
          style={{ width }}
        />
      </div>
    </div>
  );
}

function TutorFeature({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-[#eadfc9] bg-[#fffaf0] px-4 py-3 text-sm font-bold text-[#715a2d]">
      ✓ {text}
    </div>
  );
}
