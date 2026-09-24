const { SlashCommandBuilder } = require("discord.js");
const { adminPanel } = require("../utils/ui");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anime-admin")
    .setDescription("لوحة إدارة الأنمي"),

  async execute(interaction) {
    const { canManageAnime } = require("../utils/permissions");

    const { canAddEpisode } = require("../utils/permissions");

    if (!canAddEpisode(interaction.member)) {
      return interaction.reply({
        content: "❌ هذه اللوحة للإدارة فقط.",
        ephemeral: true
      });
    }

    await interaction.reply(adminPanel());
  }
};