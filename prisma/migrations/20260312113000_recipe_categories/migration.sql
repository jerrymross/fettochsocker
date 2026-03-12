-- CreateTable
CREATE TABLE `RecipeCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RecipeCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecipeCategoryLink` (
    `recipeId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `RecipeCategoryLink_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`recipeId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default categories
INSERT INTO `RecipeCategory` (`id`, `name`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
    ('cm8y1konditori000000000000000', 'Konditori', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('cm8y1bageri000000000000000000', 'Bageri', 2, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('cm8y1kram00000000000000000000', 'Kräm', 3, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('cm8y1fyllning0000000000000000', 'Fyllning', 4, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('cm8y1dessert00000000000000000', 'Dessert', 5, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('cm8y1laminerat000000000000000', 'Laminerat', 6, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- AddForeignKey
ALTER TABLE `RecipeCategoryLink` ADD CONSTRAINT `RecipeCategoryLink_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeCategoryLink` ADD CONSTRAINT `RecipeCategoryLink_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `RecipeCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
