import type { ModuleKey } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getModuleMeta, type Locale } from "@/lib/i18n";

export async function getAllModules() {
  return prisma.module.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function getEnabledModules(locale: Locale = "en") {
  const modules = await prisma.module.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  });
  const moduleMeta = getModuleMeta(locale);

  return modules.map((module) => ({
    ...module,
    ...moduleMeta[module.key],
  }));
}

export async function requireModuleEnabled(key: ModuleKey) {
  const featureModule = await getModuleByKey(key);

  if (!featureModule?.enabled) {
    notFound();
  }

  return featureModule;
}

export async function updateModuleState(key: ModuleKey, enabled: boolean) {
  return prisma.module.update({
    where: { key },
    data: { enabled },
  });
}

export async function getModuleByKey(key: ModuleKey) {
  return prisma.module.findUnique({
    where: { key },
  });
}

export async function isModuleEnabled(key: ModuleKey) {
  const featureModule = await getModuleByKey(key);
  return Boolean(featureModule?.enabled);
}
