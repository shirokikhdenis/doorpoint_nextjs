"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_DVERI_PRICING_RULE,
  DVERI_PRICING_RULES_STORAGE_KEY,
} from "./constants";
import type { DveriCategoryPricingRule, DveriPricingRulesState } from "./types";
import { normalizePricingRule } from "@/lib/dveri-catalog-utils";

export const createDefaultPricingRulesState = (): DveriPricingRulesState => ({
  defaultRule: { ...DEFAULT_DVERI_PRICING_RULE },
  categoryRules: {},
});

const parseStoredRules = (raw: string | null): DveriPricingRulesState => {
  if (!raw) return createDefaultPricingRulesState();

  try {
    const parsed = JSON.parse(raw) as Partial<DveriPricingRulesState>;
    const categoryRules: Record<string, DveriCategoryPricingRule> = {};

    if (parsed.categoryRules && typeof parsed.categoryRules === "object") {
      for (const [key, value] of Object.entries(parsed.categoryRules)) {
        categoryRules[key] = normalizePricingRule(value);
      }
    }

    return {
      defaultRule: normalizePricingRule(parsed.defaultRule ?? DEFAULT_DVERI_PRICING_RULE),
      categoryRules,
    };
  } catch {
    return createDefaultPricingRulesState();
  }
};

export function useDveriPricingRules() {
  const [rules, setRules] = useState<DveriPricingRulesState>(createDefaultPricingRulesState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRules(parseStoredRules(window.localStorage.getItem(DVERI_PRICING_RULES_STORAGE_KEY)));
    setReady(true);
  }, []);

  const persist = useCallback((next: DveriPricingRulesState) => {
    setRules(next);
    window.localStorage.setItem(DVERI_PRICING_RULES_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setDefaultRule = useCallback(
    (patch: Partial<DveriCategoryPricingRule>) => {
      persist({
        ...rules,
        defaultRule: normalizePricingRule({ ...rules.defaultRule, ...patch }),
      });
    },
    [persist, rules],
  );

  const setCategoryRule = useCallback(
    (categoryId: number, patch: Partial<DveriCategoryPricingRule>) => {
      persist({
        ...rules,
        categoryRules: {
          ...rules.categoryRules,
          [String(categoryId)]: normalizePricingRule({
            ...(rules.categoryRules[String(categoryId)] ?? rules.defaultRule),
            ...patch,
          }),
        },
      });
    },
    [persist, rules],
  );

  const addCategoryRule = useCallback(
    (categoryId: number, rule?: Partial<DveriCategoryPricingRule>) => {
      if (rules.categoryRules[String(categoryId)]) return;
      persist({
        ...rules,
        categoryRules: {
          ...rules.categoryRules,
          [String(categoryId)]: normalizePricingRule(rule ?? rules.defaultRule),
        },
      });
    },
    [persist, rules],
  );

  const removeCategoryRule = useCallback(
    (categoryId: number) => {
      const next = { ...rules.categoryRules };
      delete next[String(categoryId)];
      persist({ ...rules, categoryRules: next });
    },
    [persist, rules],
  );

  return {
    rules,
    ready,
    setDefaultRule,
    setCategoryRule,
    addCategoryRule,
    removeCategoryRule,
  };
}
