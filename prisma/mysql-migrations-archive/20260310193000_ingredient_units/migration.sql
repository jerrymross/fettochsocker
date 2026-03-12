CREATE TABLE `_RecipeIngredient_unit_new` (
    `id` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `ingredientId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unit` ENUM('G', 'KG', 'ML', 'CL', 'DL', 'L', 'TSP', 'TBSP', 'PCS') NOT NULL DEFAULT 'G',
    `note` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL,

    UNIQUE INDEX `_RecipeIngredient_unit_new_recipeId_sortOrder_key`(`recipeId`, `sortOrder`),
    INDEX `_RecipeIngredient_unit_new_ingredientId_idx`(`ingredientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_RecipeIngredient_unit_new` (`id`, `recipeId`, `ingredientId`, `quantity`, `unit`, `note`, `sortOrder`)
SELECT `id`, `recipeId`, `ingredientId`, `quantityGrams`, 'G', `note`, `sortOrder`
FROM `RecipeIngredient`;

DROP TABLE `RecipeIngredient`;

RENAME TABLE `_RecipeIngredient_unit_new` TO `RecipeIngredient`;

ALTER TABLE `RecipeIngredient`
    ADD CONSTRAINT `RecipeIngredient_recipeId_fkey`
        FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `RecipeIngredient_ingredientId_fkey`
        FOREIGN KEY (`ingredientId`) REFERENCES `Ingredient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
