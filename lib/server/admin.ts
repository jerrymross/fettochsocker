import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RecipePackageInput, UpdateRecipeVisibilityInput, UpdateUserRoleInput } from "@/lib/schemas/admin";

export async function listAdminUsers() {
  return prisma.user.findMany({
    orderBy: [
      { role: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

export async function listAdminRecipeCatalog() {
  return prisma.recipe.findMany({
    orderBy: { title: "asc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
      packageLinks: {
        include: {
          package: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function listRecipePackages() {
  return prisma.recipePackage.findMany({
    orderBy: { name: "asc" },
    include: {
      recipeLinks: {
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              isPublic: true,
            },
          },
        },
      },
      userLinks: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function updateRecipeVisibility(input: UpdateRecipeVisibilityInput) {
  return prisma.recipe.update({
    where: { id: input.recipeId },
    data: {
      isPublic: input.isPublic,
    },
  });
}

export async function createRecipePackage(input: RecipePackageInput, adminId: string) {
  return prisma.recipePackage.create({
    data: {
      name: input.name,
      description: input.description || null,
      createdById: adminId,
      recipeLinks: {
        create: input.recipeIds.map((recipeId) => ({
          recipeId,
        })),
      },
      userLinks: {
        create: input.userIds.map((userId) => ({
          userId,
        })),
      },
    },
    include: {
      recipeLinks: true,
      userLinks: true,
    },
  });
}

export async function updateRecipePackage(packageId: string, input: RecipePackageInput) {
  return prisma.$transaction(async (transaction) => {
    await transaction.recipePackageRecipeLink.deleteMany({
      where: { packageId },
    });
    await transaction.recipePackageUserLink.deleteMany({
      where: { packageId },
    });

    return transaction.recipePackage.update({
      where: { id: packageId },
      data: {
        name: input.name,
        description: input.description || null,
        recipeLinks: {
          create: input.recipeIds.map((recipeId) => ({
            recipeId,
          })),
        },
        userLinks: {
          create: input.userIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        recipeLinks: true,
        userLinks: true,
      },
    });
  });
}

export async function deleteAdminUser(userId: string, currentAdminId: string) {
  if (userId === currentAdminId) {
    throw new Error("You cannot delete your own admin account.");
  }

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (user.role === "ADMIN") {
      const adminCount = await transaction.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount <= 1) {
        throw new Error("You cannot delete the last admin user.");
      }
    }

    return transaction.user.delete({
      where: { id: userId },
      select: {
        id: true,
      },
    });
  });
}

export async function updateAdminUserRole(
  userId: string,
  input: UpdateUserRoleInput,
  currentAdminId: string,
) {
  if (userId === currentAdminId) {
    throw new Error("You cannot change your own admin role.");
  }

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (user.role === input.role) {
      return transaction.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          role: true,
        },
      });
    }

    if (user.role === UserRole.ADMIN && input.role !== UserRole.ADMIN) {
      const adminCount = await transaction.user.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new Error("You cannot demote the last admin user.");
      }
    }

    return transaction.user.update({
      where: { id: userId },
      data: {
        role: input.role,
      },
      select: {
        id: true,
        role: true,
      },
    });
  });
}
