"use client";

import { motion, useReducedMotion } from "motion/react";
import { StateBadge } from "@/components/state-badge";
import { cardRows, useLiveCode, type IssuedCardView } from "@/lib/onboarding/card";
import { DigitalCard, qrOn } from "./digital-card";
import { Body, Footer, Kicker, PrimaryAction, Screen, Title } from "./shell";

const EASE = [0.22, 1, 0.36, 1] as const;
const CARD_S = 0.55;
const TILE_DELAY_S = 0.12;

/**
 * The one-time moment when the card is first issued. The card rises in from below, then each
 * verified check ticks in (120ms apart), then the title and CONTINUE. No confetti, gradient or
 * shadow (DESIGN.md §1, §7). With reduced motion everything only fades.
 */
export function CardReveal({ card, onDone }: { card: IssuedCardView; onDone: () => void }) {
  const reduce = useReducedMotion();
  const live = useLiveCode(card.live, { enabled: qrOn(card) });
  const verified = cardRows(card.checks).filter((row) => row.state === "verified");
  const tilesStart = reduce ? 0.15 : CARD_S + 0.05;
  const titleAt = tilesStart + verified.length * (reduce ? 0.04 : TILE_DELAY_S) + 0.2;

  return (
    <Screen>
      <Body className="pt-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: titleAt, duration: 0.3, ease: "easeOut" }} aria-live="polite">
          <Kicker className="tracking-[0.12em]">Card issued</Kicker>
          <Title className="mt-1.5 mb-5">Your Liwip BGV Card is ready</Title>
        </motion.div>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 160 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 210, damping: 26, mass: 0.9, opacity: { duration: 0.25 } }}
        >
          <DigitalCard card={card} live={live} />
        </motion.div>

        {verified.length > 0 && (
          <ul className="mt-5 mb-0 grid list-none grid-cols-2 border-t border-l border-border p-0 min-[520px]:grid-cols-3">
            {verified.map((row, index) => (
              <motion.li
                key={row.key}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ delay: tilesStart + index * (reduce ? 0.04 : TILE_DELAY_S), duration: reduce ? 0.2 : 0.28, ease: EASE }}
                className="flex min-h-[76px] flex-col justify-between gap-2 border-r border-b border-border p-3"
              >
                <span className="text-[14px] leading-[1.3] font-medium">{row.name}</span>
                <StateBadge state="verified" />
              </motion.li>
            ))}
          </ul>
        )}
      </Body>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: titleAt + 0.1, duration: 0.3, ease: "easeOut" }} className="flex-none">
        <Footer>
          <PrimaryAction onClick={onDone}>Continue</PrimaryAction>
        </Footer>
      </motion.div>
    </Screen>
  );
}
