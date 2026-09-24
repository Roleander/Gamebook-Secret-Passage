"use client";

import { Header } from "@/components/header";
import { HeroLogo } from "@/components/hero-logo";
import { BookOpen, Sparkles, FileText, ArrowRight, Upload, Link2, Download, ShieldCheck, Wand2, Crown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";
import { useI18n } from "@/lib/i18n";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const stepIcons = [Upload, Link2, Download];
const featureIcons = [FileText, ShieldCheck, BookOpen];
const badgeIcons = [Sparkles, Wand2, Crown];

export default function Home() {
  const { t } = useI18n();

  const steps = ["1", "2", "3"].map((key, i) => ({
    icon: stepIcons[i],
    title: t(`Home.steps.${key}.title`),
    text: t(`Home.steps.${key}.text`),
  }));

  const features = ["1", "2", "3"].map((key, i) => ({
    icon: featureIcons[i],
    title: t(`Home.featuresList.${key}.title`),
    text: t(`Home.featuresList.${key}.text`),
  }));

  const badges = ["1", "2", "3"].map((key, i) => ({
    icon: badgeIcons[i],
    text: t(`Home.badges.${key}`),
  }));

  return (
    <div className="min-h-screen bg-dungeon">
      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div
          className="text-center mb-20"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <HeroLogo />
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-5xl font-bold mb-4 text-primary font-pixel"
          >
            Gamebook Secret Passage
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-2xl font-semibold text-foreground max-w-3xl mx-auto mb-3"
          >
            {t("Home.lema")}
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            {t("Home.description")}
          </motion.p>
          <motion.p variants={fadeUp} className="text-sm text-muted-foreground mt-4">
            {t("Home.microcopy")}
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-4 mt-8"
          >
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8 py-4">
                {t("Home.ctaPrimary")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                {t("Home.ctaSecondary")}
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Cómo funciona */}
        <motion.section
          className="mb-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold text-center text-primary mb-10 font-pixel"
          >
            {t("Home.howItWorks")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="border-medieval rounded-lg p-6 bg-card/50 text-center"
              >
                <step.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          className="mb-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold text-center text-primary mb-10 font-pixel"
          >
            {t("Home.featuresSection")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="border-medieval rounded-lg p-6 bg-card/50"
              >
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Prueba social / franja */}
        <motion.div
          className="mb-16 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          {badges.map((item) => (
            <motion.span
              key={item.text}
              variants={fadeUp}
              className="flex items-center gap-2 border border-medieval rounded-full px-4 py-2 bg-card/40"
            >
              <item.icon className="w-4 h-4 text-primary" />
              {item.text}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA final */}
        <motion.div
          className="text-center border-medieval rounded-lg p-10 bg-card/50"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-2xl font-bold mb-3 text-primary font-pixel"
          >
            {t("Home.finalCtaTitle")}
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mb-6 max-w-xl mx-auto">
            {t("Home.finalCtaText")}
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/projects/new">
              <Button size="lg" className="text-lg px-8 py-4">
                {t("Home.finalCtaButton")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>{t("Home.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
