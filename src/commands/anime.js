const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const Anime = require("../models/Anime");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchSelect(animes) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("user_anime_select")
    .setPlaceholder("🎬 اختر الأنمي");

  animes.slice(0, 25).forEach((anime) => {
    menu.addOptions({
      label: anime.title.slice(0, 100),
      description: `${anime.episodes.length} حلقة • ${anime.status || "غير محدد"}`.slice(0, 100),
      value: String(anime._id),
      emoji: "🎬"
    });
  });

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anime")
    .setDescription("البحث عن أنمي")
    .addStringOption(o =>
      o.setName("بحث").setDescription("اسم الأنمي").setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("بحث");
    await interaction.deferReply();

    const animes = await Anime.find({
      title: { $regex: escapeRegex(query), $options: "i" }
    })
      .sort({ title: 1 })
      .limit(25);

    if (!animes.length) {
      return interaction.editReply("❌ لم أجد أي أنمي بهذا الاسم في قاعدة بيانات البوت.");
    }

    await interaction.editReply({
      content: `🔎 نتائج البحث عن **${query}** — اختر الأنمي من القائمة:`,
      components: [searchSelect(animes)]
    });
  }
};