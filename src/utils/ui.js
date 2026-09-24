const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

function animeEmbed(anime) {
  const embed = new EmbedBuilder()
    .setColor("#8B5CF6")
    .setTitle(`🎬 ${anime.title}`)
    .setDescription(anime.description || "لا يوجد وصف لهذا الأنمي.")
    .addFields(
      { name: "⭐ التقييم", value: anime.rating ? `${anime.rating}/10` : "غير محدد", inline: true },
      { name: "🎞️ الحلقات", value: String(anime.episodes.length), inline: true },
      { name: "📅 السنة", value: anime.year ? String(anime.year) : "غير محددة", inline: true },
      { name: "📺 الحالة", value: anime.status || "غير محددة", inline: true },
      { name: "🏷️ التصنيفات", value: anime.genres?.length ? anime.genres.join(" • ") : "غير محددة", inline: false }
    )
    .setFooter({ text: "Anime System" });

  if (anime.image) embed.setThumbnail(anime.image);
  if (anime.banner) embed.setImage(anime.banner);
  return embed;
}

function episodeEmbed(anime, index) {
  const ep = anime.episodes[index];
  const embed = new EmbedBuilder()
    .setColor("#8B5CF6")
    .setTitle(`🎬 ${anime.title}`)
    .setDescription(`## الحلقة ${ep.number}\n${ep.title}`)
    .addFields(
      { name: "📺 الحلقة", value: `${index + 1} / ${anime.episodes.length}`, inline: true },
      { name: "🔢 الرقم", value: String(ep.number), inline: true }
    )
    .setFooter({ text: "Anime System • Episode System" });

  if (ep.image || anime.image) embed.setThumbnail(ep.image || anime.image);
  return embed;
}

function episodeButtons(anime, index) {
  const previous = new ButtonBuilder()
    .setCustomId(`ep_prev:${anime._id}:${index}`)
    .setLabel("السابق")
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(index <= 0);

  const number = new ButtonBuilder()
    .setCustomId(`ep_number:${anime._id}:${index}`)
    .setLabel("رقم الحلقة")
    .setEmoji("🔢")
    .setStyle(ButtonStyle.Primary);

  const next = new ButtonBuilder()
    .setCustomId(`ep_next:${anime._id}:${index}`)
    .setLabel("التالي")
    .setEmoji("▶️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(index >= anime.episodes.length - 1);

  const watch = new ButtonBuilder()
    .setLabel("مشاهدة")
    .setEmoji("📺")
    .setStyle(ButtonStyle.Link)
    .setURL(anime.episodes[index].watchUrl);

  return new ActionRowBuilder().addComponents(previous, number, next, watch);
}

function adminPanel() {
  const embed = new EmbedBuilder()
    .setColor("#8B5CF6")
    .setTitle("🛠️ Anime Manager")
    .setDescription(
      "لوحة إدارة الأنمي.\n\n" +
      "🟢 **الإدارة الصغرى:** إضافة الحلقات فقط.\n" +
      "🔴 **الإدارة الكبرى:** إضافة/تعديل/حذف الحلقات وإدارة بيانات الأنمي."
    )
    .setFooter({ text: "Anime System • Admin Panel" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("admin_add_anime").setLabel("إضافة أنمي").setEmoji("➕").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("admin_edit_anime").setLabel("تعديل أنمي").setEmoji("✏️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("admin_delete_anime").setLabel("حذف أنمي").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("admin_add_episode").setLabel("إضافة حلقة").setEmoji("🎞️").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("admin_edit_episode").setLabel("تعديل حلقة").setEmoji("✏️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("admin_delete_episode").setLabel("حذف حلقة").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row1, row2] };
}

function animeSelect(animes, customId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("🎬 اختر الأنمي");

  animes.slice(0, 25).forEach((anime) => {
    menu.addOptions({
      label: anime.title.slice(0, 100),
      description: `${anime.episodes.length} حلقة`,
      value: String(anime._id),
      emoji: "🎬"
    });
  });

  return new ActionRowBuilder().addComponents(menu);
}

function episodeSelect(anime, customId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("🎞️ اختر الحلقة");

  anime.episodes.slice(0, 25).forEach((ep) => {
    menu.addOptions({
      label: `الحلقة ${ep.number} - ${ep.title}`.slice(0, 100),
      description: ep.watchUrl.slice(0, 100),
      value: String(ep._id),
      emoji: "🎞️"
    });
  });

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  animeEmbed,
  episodeEmbed,
  episodeButtons,
  adminPanel,
  animeSelect,
  episodeSelect
};