"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { inputClass, panelClass, primaryButtonClass, secondaryButtonClass, textareaClass } from "@/lib/ui";

type AdminRecipeItem = {
  id: string;
  title: string;
  isPublic: boolean;
  authorName: string;
  categories: string[];
  packageNames: string[];
};

type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
};

type AdminPackageItem = {
  id: string;
  name: string;
  description: string;
  createdByName: string;
  recipeIds: string[];
  userIds: string[];
};

function PackageEditorCard({
  packageItem,
  recipes,
  users,
}: {
  packageItem: AdminPackageItem;
  recipes: AdminRecipeItem[];
  users: AdminUserItem[];
}) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(packageItem.name);
  const [description, setDescription] = useState(packageItem.description);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState(packageItem.recipeIds);
  const [selectedUserIds, setSelectedUserIds] = useState(packageItem.userIds);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleSelection(current: string[], value: string) {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  }

  function handleSave() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/packages/${packageItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          recipeIds: selectedRecipeIds,
          userIds: selectedUserIds,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? dictionary.adminPage.packageFailed);
        return;
      }

      setMessage(dictionary.adminPage.packageSaved);
      router.refresh();
    });
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-950">{packageItem.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            {dictionary.adminPage.createdBy}: {packageItem.createdByName}
          </p>
        </div>
        <button className={primaryButtonClass} disabled={isPending} onClick={handleSave} type="button">
          {dictionary.adminPage.savePackage}
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1fr_1fr]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">{dictionary.adminPage.packageName}</label>
          <input className={inputClass} onChange={(event) => setName(event.target.value)} value={name} />
          <label className="text-sm font-medium text-slate-700">{dictionary.adminPage.packageDescriptionField}</label>
          <textarea className={textareaClass} onChange={(event) => setDescription(event.target.value)} value={description} />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">{dictionary.adminPage.includedRecipes}</p>
          <div className="grid max-h-[18rem] gap-2 overflow-y-auto pr-1">
            {recipes.map((recipe) => (
              <label key={recipe.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <input
                  checked={selectedRecipeIds.includes(recipe.id)}
                  className="mt-1"
                  onChange={() => setSelectedRecipeIds((current) => toggleSelection(current, recipe.id))}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-slate-950">{recipe.title}</span>
                  <span className="block text-sm text-slate-500">{recipe.isPublic ? dictionary.adminPage.publicRecipe : dictionary.adminPage.adminOnlyRecipe}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">{dictionary.adminPage.assignedUsers}</p>
          <div className="grid max-h-[18rem] gap-2 overflow-y-auto pr-1">
            {users.map((user) => (
              <label key={user.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <input
                  checked={selectedUserIds.includes(user.id)}
                  className="mt-1"
                  onChange={() => setSelectedUserIds((current) => toggleSelection(current, user.id))}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-slate-950">{user.name}</span>
                  <span className="block text-sm text-slate-500">{user.email}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

export function AdminCatalogManager({
  currentAdminUserId,
  recipes,
  users,
  packages,
}: {
  currentAdminUserId: string;
  recipes: AdminRecipeItem[];
  users: AdminUserItem[];
  packages: AdminPackageItem[];
}) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [recipesState, setRecipesState] = useState(recipes);
  const [usersState, setUsersState] = useState(users);
  const [visibilityMessage, setVisibilityMessage] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [packageMessage, setPackageMessage] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  function toggleSelection(current: string[], value: string) {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  }

  function handleVisibilityChange(recipeId: string, isPublic: boolean) {
    setVisibilityMessage(null);
    setVisibilityError(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/recipes/visibility", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipeId, isPublic }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setVisibilityError(payload.error ?? dictionary.adminPage.visibilityFailed);
        return;
      }

      setRecipesState((current) =>
        current.map((recipe) => (recipe.id === recipeId ? { ...recipe, isPublic } : recipe)),
      );
      setVisibilityMessage(dictionary.adminPage.visibilityUpdated);
      router.refresh();
    });
  }

  function handleCreatePackage() {
    setPackageMessage(null);
    setPackageError(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          recipeIds: selectedRecipeIds,
          userIds: selectedUserIds,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setPackageError(payload.error ?? dictionary.adminPage.packageFailed);
        return;
      }

      setPackageMessage(dictionary.adminPage.packageSaved);
      setName("");
      setDescription("");
      setSelectedRecipeIds([]);
      setSelectedUserIds([]);
      router.refresh();
    });
  }

  function handleDeleteUser(userId: string) {
    if (!window.confirm(dictionary.adminPage.deleteUserConfirm)) {
      return;
    }

    setUserMessage(null);
    setUserError(null);
    setDeletingUserId(userId);

    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setUserError(payload.error ?? dictionary.adminPage.deleteUserFailed);
        setDeletingUserId(null);
        return;
      }

      setUsersState((current) => current.filter((user) => user.id !== userId));
      setSelectedUserIds((current) => current.filter((selectedUserId) => selectedUserId !== userId));
      setUserMessage(dictionary.adminPage.userDeleted);
      setDeletingUserId(null);
      router.refresh();
    });
  }

  function handleRoleChange(userId: string, role: "ADMIN" | "USER") {
    setUserMessage(null);
    setUserError(null);
    setUpdatingUserId(userId);

    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setUserError(payload.error ?? dictionary.adminPage.roleUpdateFailed);
        setUpdatingUserId(null);
        return;
      }

      setUsersState((current) =>
        current.map((user) => (user.id === userId ? { ...user, role } : user)),
      );
      setUserMessage(dictionary.adminPage.roleUpdated);
      setUpdatingUserId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className={`${panelClass} space-y-4`}>
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{dictionary.adminPage.recipeAccessTitle}</h2>
          <p className="mt-2 text-sm text-slate-700">{dictionary.adminPage.recipeAccessDescription}</p>
        </div>

        <div className="space-y-3">
          {recipesState.map((recipe) => (
            <div key={recipe.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50/60 px-4 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-950">{recipe.title}</p>
                <p className="mt-1 text-sm text-slate-500">{recipe.authorName}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recipe.categories.map((category) => (
                    <span key={category} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      {category}
                    </span>
                  ))}
                  {recipe.packageNames.map((packageName) => (
                    <span key={packageName} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                      {packageName}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    recipe.isPublic
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={() => handleVisibilityChange(recipe.id, true)}
                  type="button"
                >
                  {dictionary.adminPage.publicRecipe}
                </button>
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    !recipe.isPublic
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={() => handleVisibilityChange(recipe.id, false)}
                  type="button"
                >
                  {dictionary.adminPage.adminOnlyRecipe}
                </button>
              </div>
            </div>
          ))}
        </div>

        {visibilityMessage ? <p className="text-sm text-emerald-700">{visibilityMessage}</p> : null}
        {visibilityError ? <p className="text-sm text-rose-600">{visibilityError}</p> : null}
      </section>

      <section className={`${panelClass} space-y-4`}>
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{dictionary.adminPage.userManagementTitle}</h2>
          <p className="mt-2 text-sm text-slate-700">{dictionary.adminPage.userManagementDescription}</p>
        </div>

        <div className="space-y-3">
          {usersState.map((user) => {
            const isCurrentAdmin = user.id === currentAdminUserId;
            const isUpdating = updatingUserId === user.id;

            return (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50/60 px-4 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        user.role === "ADMIN"
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      disabled={isCurrentAdmin || isUpdating}
                      onClick={() => handleRoleChange(user.id, "ADMIN")}
                      type="button"
                    >
                      {dictionary.adminPage.makeAdmin}
                    </button>
                    <button
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        user.role === "USER"
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      disabled={isCurrentAdmin || isUpdating}
                      onClick={() => handleRoleChange(user.id, "USER")}
                      type="button"
                    >
                      {dictionary.adminPage.makeUser}
                    </button>
                  </div>
                </div>

                <button
                  className={secondaryButtonClass}
                  disabled={isCurrentAdmin || deletingUserId === user.id || isUpdating}
                  onClick={() => handleDeleteUser(user.id)}
                  type="button"
                >
                  <Trash2 className="mr-2 size-4" />
                  {deletingUserId === user.id ? dictionary.adminPage.deletingUser : dictionary.adminPage.deleteUser}
                </button>
              </div>
            );
          })}
        </div>

        {userMessage ? <p className="text-sm text-emerald-700">{userMessage}</p> : null}
        {userError ? <p className="text-sm text-rose-600">{userError}</p> : null}
      </section>

      <section className={`${panelClass} space-y-4`}>
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{dictionary.adminPage.packageTitle}</h2>
          <p className="mt-2 text-sm text-slate-700">{dictionary.adminPage.packageDescription}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1fr_1fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{dictionary.adminPage.packageName}</label>
            <input className={inputClass} onChange={(event) => setName(event.target.value)} value={name} />
            <label className="text-sm font-medium text-slate-700">{dictionary.adminPage.packageDescriptionField}</label>
            <textarea className={textareaClass} onChange={(event) => setDescription(event.target.value)} value={description} />
            <button className={primaryButtonClass} disabled={isPending || name.trim().length < 2} onClick={handleCreatePackage} type="button">
              {dictionary.adminPage.createPackage}
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">{dictionary.adminPage.includedRecipes}</p>
            <div className="grid max-h-[18rem] gap-2 overflow-y-auto pr-1">
              {recipesState.map((recipe) => (
                <label key={recipe.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <input
                    checked={selectedRecipeIds.includes(recipe.id)}
                    className="mt-1"
                    onChange={() => setSelectedRecipeIds((current) => toggleSelection(current, recipe.id))}
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-medium text-slate-950">{recipe.title}</span>
                    <span className="block text-sm text-slate-500">{recipe.isPublic ? dictionary.adminPage.publicRecipe : dictionary.adminPage.adminOnlyRecipe}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">{dictionary.adminPage.assignedUsers}</p>
            <div className="grid max-h-[18rem] gap-2 overflow-y-auto pr-1">
              {users.map((user) => (
                <label key={user.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <input
                    checked={selectedUserIds.includes(user.id)}
                    className="mt-1"
                    onChange={() => setSelectedUserIds((current) => toggleSelection(current, user.id))}
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-medium text-slate-950">{user.name}</span>
                    <span className="block text-sm text-slate-500">{user.email}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {packageMessage ? <p className="text-sm text-emerald-700">{packageMessage}</p> : null}
        {packageError ? <p className="text-sm text-rose-600">{packageError}</p> : null}

        <div className="space-y-4">
          {packages.length === 0 ? (
            <p className="text-sm text-slate-500">{dictionary.adminPage.noPackages}</p>
          ) : (
            packages.map((packageItem) => (
              <PackageEditorCard key={packageItem.id} packageItem={packageItem} recipes={recipesState} users={usersState} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
