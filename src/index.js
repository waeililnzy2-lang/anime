require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder
} = require("discord.js");

const { connectDatabase } = require("./db");
const Anime = require("./models/Anime");
const animeCommand = require("./commands/anime");
const adminCommand = require("./commands/admin");
const {
  animeEmbed,
  episodeEmbed,
  episodeButtons,
  animeSelect,
  episodeSelect
} = require("./utils/ui");
const {
  canAddEpisode,
  canManageEpisodes,
  canManageAnime
} = require("./utils/permissions");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

client.commands.set(animeCommand.data.name, animeCommand);
client.commands.set(adminCommand.data.name, adminCommand);

const commands = [animeCommand.data.toJSON(), adminCommand.data.toJSON()];

function modal(id, title, fields) {
  const m = new ModalBuilder().setCustomId(id).setTitle(title);
  for (const field of fields) {
    const input = new TextInputBuilder()
      .setCustomId(field.id)
      .setLabel(field.label)
      .setStyle(field.style || TextInputStyle.Short)
      .setRequired(field.required ?? true)
      .setMaxLength(field.maxLength || 1000)
      .setPlaceholder(field.placeholder || "");
    m.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return m;
}

async function logAction(text) {
  if (!process.env.LOG_CHANNEL_ID) return;
  const channel = await client.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null);
  if (channel?.isTextBased()) {
    channel.send({ embeds: [new EmbedBuilder().setColor("#8B5CF6").setDescription(text)] }).catch(() => {});
  }
}

client.once(Events.ClientReady, async (ready) => {
  console.log(`✅ Logged in as ${ready.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash commands registered.");
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }

    // ===== User episode selection =====
    if (interaction.isButton() && interaction.customId.startsWith("start_episodes:")) {
      const id = interaction.customId.split(":")[1];
      const anime = await Anime.findById(id);
      if (!anime) return interaction.reply({ content: "❌ الأنمي غير موجود.", flags: MessageFlags.Ephemeral });

      await interaction.update({
        embeds: [episodeEmbed(anime, 0)],
        components: [episodeButtons(anime, 0)]
      });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("ep_")) {
      const [action, id, indexText] = interaction.customId.split(":");
      const anime = await Anime.findById(id);
      if (!anime || !anime.episodes.length) {
        return interaction.reply({ content: "❌ الحلقة غير موجودة.", flags: MessageFlags.Ephemeral });
      }

      let index = Number(indexText);

      if (action === "ep_prev") index--;
      if (action === "ep_next") index++;

      index = Math.max(0, Math.min(index, anime.episodes.length - 1));

      if (action === "ep_number") {
        return interaction.showModal(modal(
          `choose_episode:${id}`,
          "اختيار الحلقة",
          [{
            id: "number",
            label: "رقم الحلقة",
            placeholder: `1 - ${anime.episodes.length}`,
            maxLength: 6
          }]
        ));
      }

      await interaction.update({
        embeds: [episodeEmbed(anime, index)],
        components: [episodeButtons(anime, index)]
      });
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("choose_episode:")) {
      const id = interaction.customId.split(":")[1];
      const anime = await Anime.findById(id);
      if (!anime) return interaction.reply({ content: "❌ الأنمي غير موجود.", flags: MessageFlags.Ephemeral });

      const number = Number(interaction.fields.getTextInputValue("number"));
      const index = anime.episodes.findIndex(e => e.number === number);

      if (index === -1) {
        return interaction.reply({
          content: `❌ الحلقة ${number} غير موجودة.`,
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.update({
        embeds: [episodeEmbed(anime, index)],
        components: [episodeButtons(anime, index)]
      });
      return;
    }

    // ===== Admin panel =====
    if (interaction.isButton() && interaction.customId.startsWith("admin_")) {
      const id = interaction.customId;

      if (id === "admin_add_episode") {
        if (!canAddEpisode(interaction.member)) {
          return interaction.reply({ content: "❌ إضافة الحلقات للإدارة الصغرى أو الكبرى فقط.", flags: MessageFlags.Ephemeral });
        }

        const animes = await Anime.find().sort({ title: 1 }).limit(25);
        if (!animes.length) return interaction.reply({ content: "❌ لا توجد أنميات.", flags: MessageFlags.Ephemeral });

        return interaction.reply({
          content: "اختر الأنمي الذي تريد إضافة الحلقة له:",
          components: [animeSelect(animes, "add_ep_anime")],
          flags: MessageFlags.Ephemeral
        });
      }

      if (["admin_edit_episode", "admin_delete_episode"].includes(id)) {
        if (!canManageEpisodes(interaction.member)) {
          return interaction.reply({ content: "❌ تعديل وحذف الحلقات للإدارة الكبرى فقط.", flags: MessageFlags.Ephemeral });
        }

        const animes = await Anime.find().sort({ title: 1 }).limit(25);
        return interaction.reply({
          content: "اختر الأنمي:",
          components: [animeSelect(animes, `${id}_anime`)],
          flags: MessageFlags.Ephemeral
        });
      }

      if (id === "admin_add_anime") {
        if (!canManageAnime(interaction.member)) return interaction.reply({ content: "❌ الإدارة الكبرى فقط.", flags: MessageFlags.Ephemeral });

        return interaction.showModal(modal("add_anime", "إضافة أنمي", [
          { id: "title", label: "اسم الأنمي", maxLength: 100 },
          { id: "description", label: "الوصف", style: TextInputStyle.Paragraph, maxLength: 4000 },
          { id: "image", label: "رابط صورة الأنمي", maxLength: 500 },
          { id: "banner", label: "رابط صورة البانر", required: false, maxLength: 500 },
          { id: "meta", label: "التقييم | السنة | الحالة | التصنيفات", placeholder: "8.7 | 2026 | مستمر | أكشن، مغامرات", maxLength: 300 }
        ]));
      }

      if (id === "admin_edit_anime") {
        if (!canManageAnime(interaction.member)) return interaction.reply({ content: "❌ الإدارة الكبرى فقط.", flags: MessageFlags.Ephemeral });
        const animes = await Anime.find().sort({ title: 1 }).limit(25);
        return interaction.reply({
          content: "اختر الأنمي الذي تريد تعديله:",
          components: [animeSelect(animes, "edit_anime_select")],
          flags: MessageFlags.Ephemeral
        });
      }

      if (id === "admin_delete_anime") {
        if (!canManageAnime(interaction.member)) return interaction.reply({ content: "❌ الإدارة الكبرى فقط.", flags: MessageFlags.Ephemeral });
        const animes = await Anime.find().sort({ title: 1 }).limit(25);
        return interaction.reply({
          content: "اختر الأنمي الذي تريد حذفه:",
          components: [animeSelect(animes, "delete_anime_select")],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // ===== User anime selection =====
    if (interaction.isStringSelectMenu() && interaction.customId === "user_anime_select") {
      const animeId = interaction.values[0];
      const anime = await Anime.findById(animeId);

      if (!anime) {
        return interaction.update({
          content: "❌ الأنمي غير موجود.",
          components: []
        });
      }

      if (!anime.episodes.length) {
        return interaction.update({
          content: "⚠️ هذا الأنمي لا يحتوي على حلقات حاليًا.",
          embeds: [animeEmbed(anime)],
          components: []
        });
      }

      const { ButtonBuilder, ButtonStyle } = require("discord.js");

      return interaction.update({
        content: null,
        embeds: [animeEmbed(anime)],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`start_episodes:${anime._id}`)
              .setLabel("اختيار الحلقة")
              .setEmoji("🎞️")
              .setStyle(ButtonStyle.Primary)
          )
        ]
      });
    }

    // ===== Admin selects =====
    if (interaction.isStringSelectMenu()) {
      const id = interaction.customId;
      const value = interaction.values[0];

      if (id === "add_ep_anime") {
        if (!canAddEpisode(interaction.member)) return interaction.reply({ content: "❌ لا تملك الصلاحية.", flags: MessageFlags.Ephemeral });
        return interaction.showModal(modal(`add_episode:${value}`, "إضافة حلقة", [
          { id: "number", label: "رقم الحلقة", maxLength: 6 },
          { id: "title", label: "اسم الحلقة", maxLength: 100 },
          { id: "watchUrl", label: "رابط المشاهدة", maxLength: 500 },
          { id: "image", label: "رابط صورة الحلقة", required: false, maxLength: 500 }
        ]));
      }

      if (id === "admin_edit_episode_anime") {
        if (!canManageEpisodes(interaction.member)) return interaction.reply({ content: "❌ لا تملك الصلاحية.", flags: MessageFlags.Ephemeral });
        const anime = await Anime.findById(value);
        if (!anime || !anime.episodes.length) return interaction.update({ content: "❌ لا توجد حلقات.", components: [] });
        return interaction.update({ content: "اختر الحلقة للتعديل:", components: [episodeSelect(anime, "edit_episode_select")] });
      }

      if (id === "admin_delete_episode_anime") {
        if (!canManageEpisodes(interaction.member)) return interaction.reply({ content: "❌ لا تملك الصلاحية.", flags: MessageFlags.Ephemeral });
        const anime = await Anime.findById(value);
        if (!anime || !anime.episodes.length) return interaction.update({ content: "❌ لا توجد حلقات.", components: [] });
        return interaction.update({ content: "اختر الحلقة للحذف:", components: [episodeSelect(anime, "delete_episode_select")] });
      }

      if (id === "edit_episode_select") {
        if (!canManageEpisodes(interaction.member)) return interaction.reply({ content: "❌ لا تملك الصلاحية.", flags: MessageFlags.Ephemeral });
        const episodeId = value;
        const anime = await Anime.findOne({ "episodes._id": episodeId });
        const ep = anime?.episodes.id(episodeId);
        if (!anime || !ep) return interaction.reply({ content: "❌ الحلقة غير موجودة.", flags: MessageFlags.Ephemeral });

        return interaction.showModal(modal(`edit_episode:${anime._id}:${episodeId}`, "تعديل الحلقة", [
          { id: "title", label: "اسم الحلقة الجديد", maxLength: 100 },
          { id: "watchUrl", label: "رابط المشاهدة", maxLength: 500 },
          { id: "image", label: "رابط الصورة", required: false, maxLength: 500 }
        ]));
      }

      if (id === "delete_episode_select") {
        if (!canManageEpisodes(interaction.member)) return interaction.reply({ content: "❌ لا تملك الصلاحية.", flags: MessageFlags.Ephemeral });
        const episodeId = value;
        const anime = await Anime.findOne({ "episodes._id": episodeId });
        const ep = anime?.episodes.id(episodeId);
        if (!anime || !ep) return interaction.reply({ content: "❌ الحلقة غير موجودة.", flags: MessageFlags.Ephemeral });

        anime.episodes.pull(episodeId);
        await anime.save();
        await logAction(`🗑️ تم حذف الحلقة **${ep.number} - ${ep.title}** من **${anime.title}** بواسطة ${interaction.user}.`);
        return interaction.update({ content: `✅ تم حذف الحلقة **${ep.number} - ${ep.title}**.`, components: [] });
      }

      if (id === "edit_anime_select") {
        if (!canManageAnime(interaction.member)) return interaction.reply({ content: "❌ لا تملك الصلاحية.", flags: MessageFlags.Ephemeral });
        const anime = await Anime.findById(value);
        if (!anime) return interaction.reply({ content: "❌ الأنمي غير موجود.", flags: MessageFlags.Ephemeral });

        return interaction.showModal(modal(`edit_anime:${value}`, "تعديل الأنمي", [
          { id: "title", label: "اسم الأنمي", maxLength: 100 },
          { id: "description", label: "الوصف", style: TextInputStyle.Paragraph, maxLength: 4000 },
          { id: "image", label: "رابط صورة الأنمي", maxLength: 500 },
          { id: "banner", label: "رابط البانر", required: false, maxLength: 500 },
          { id: "meta", label: "التقييم | السنة | الحالة | التصنيفات", placeholder: "8.7 | 2026 | مستمر | أكشن، مغامرات", maxLength: 300 }
        ]));
      }

      if (id === "delete_anime_select") {
        if (!canManageAnime(interaction.member)) return interaction.reply({ content: "❌ لا تملك الصلاحية.", flags: MessageFlags.Ephemeral });
        const anime = await Anime.findByIdAndDelete(value);
        if (!anime) return interaction.reply({ content: "❌ الأنمي غير موجود.", flags: MessageFlags.Ephemeral });
        await logAction(`🗑️ تم حذف الأنمي **${anime.title}** بواسطة ${interaction.user}.`);
        return interaction.update({ content: `✅ تم حذف الأنمي **${anime.title}**.`, components: [] });
      }
    }

    // ===== Admin modals =====
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      if (id === "add_anime") {
        if (!canManageAnime(interaction.member)) return interaction.reply({ content: "❌ الإدارة الكبرى فقط.", flags: MessageFlags.Ephemeral });

        const title = interaction.fields.getTextInputValue("title");
        const description = interaction.fields.getTextInputValue("description");
        const image = interaction.fields.getTextInputValue("image");
        const banner = interaction.fields.getTextInputValue("banner");
        const meta = interaction.fields.getTextInputValue("meta");
        const [rating, year, status, genres] = meta.split("|").map(x => x.trim());

        const anime = await Anime.create({
          title,
          description,
          image,
          banner,
          rating: Number(rating) || 0,
          year: Number(year) || null,
          status: status || "مستمر",
          genres: genres ? genres.split("،").map(x => x.trim()).filter(Boolean) : []
        });

        await logAction(`➕ تمت إضافة الأنمي **${anime.title}** بواسطة ${interaction.user}.`);
        return interaction.reply({ content: `✅ تمت إضافة **${anime.title}** بنجاح.`, flags: MessageFlags.Ephemeral });
      }

      if (id.startsWith("add_episode:")) {
        if (!canAddEpisode(interaction.member)) return interaction.reply({ content: "❌ لا تملك صلاحية إضافة الحلقات.", flags: MessageFlags.Ephemeral });

        const animeId = id.split(":")[1];
        const anime = await Anime.findById(animeId);
        if (!anime) return interaction.reply({ content: "❌ الأنمي غير موجود.", flags: MessageFlags.Ephemeral });

        const number = Number(interaction.fields.getTextInputValue("number"));
        const title = interaction.fields.getTextInputValue("title");
        const watchUrl = interaction.fields.getTextInputValue("watchUrl");
        const image = interaction.fields.getTextInputValue("image");

        if (!Number.isInteger(number) || number < 1) {
          return interaction.reply({ content: "❌ رقم الحلقة غير صحيح.", flags: MessageFlags.Ephemeral });
        }
        if (anime.episodes.some(e => e.number === number)) {
          return interaction.reply({ content: "❌ هذه الحلقة موجودة بالفعل.", flags: MessageFlags.Ephemeral });
        }

        anime.episodes.push({ number, title, watchUrl, image });
        anime.episodes.sort((a, b) => a.number - b.number);
        await anime.save();

        await logAction(`➕ تمت إضافة الحلقة **${number} - ${title}** إلى **${anime.title}** بواسطة ${interaction.user}.`);
        return interaction.reply({ content: `✅ تمت إضافة الحلقة **${number} - ${title}**.`, flags: MessageFlags.Ephemeral });
      }

      if (id.startsWith("edit_episode:")) {
        if (!canManageEpisodes(interaction.member)) return interaction.reply({ content: "❌ الإدارة الكبرى فقط.", flags: MessageFlags.Ephemeral });

        const [, animeId, episodeId] = id.split(":");
        const anime = await Anime.findById(animeId);
        const ep = anime?.episodes.id(episodeId);
        if (!anime || !ep) return interaction.reply({ content: "❌ الحلقة غير موجودة.", flags: MessageFlags.Ephemeral });

        ep.title = interaction.fields.getTextInputValue("title");
        ep.watchUrl = interaction.fields.getTextInputValue("watchUrl");
        ep.image = interaction.fields.getTextInputValue("image");
        await anime.save();

        await logAction(`✏️ تم تعديل الحلقة **${ep.number}** في **${anime.title}** بواسطة ${interaction.user}.`);
        return interaction.reply({ content: `✅ تم تعديل الحلقة **${ep.number}** بنجاح.`, flags: MessageFlags.Ephemeral });
      }

      if (id.startsWith("edit_anime:")) {
        if (!canManageAnime(interaction.member)) return interaction.reply({ content: "❌ الإدارة الكبرى فقط.", flags: MessageFlags.Ephemeral });

        const animeId = id.split(":")[1];
        const anime = await Anime.findById(animeId);
        if (!anime) return interaction.reply({ content: "❌ الأنمي غير موجود.", flags: MessageFlags.Ephemeral });

        const oldTitle = anime.title;
        const title = interaction.fields.getTextInputValue("title");
        const description = interaction.fields.getTextInputValue("description");
        const image = interaction.fields.getTextInputValue("image");
        const banner = interaction.fields.getTextInputValue("banner");
        const meta = interaction.fields.getTextInputValue("meta");
        const [rating, year, status, genres] = meta.split("|").map(x => x.trim());

        anime.title = title;
        anime.description = description;
        anime.image = image;
        anime.banner = banner;
        anime.rating = Number(rating) || 0;
        anime.year = Number(year) || null;
        anime.status = status || "مستمر";
        anime.genres = genres ? genres.split("،").map(x => x.trim()).filter(Boolean) : [];

        await anime.save();
        await logAction(`✏️ تم تعديل الأنمي **${oldTitle}** إلى **${anime.title}** بواسطة ${interaction.user}.`);
        return interaction.reply({ content: `✅ تم تعديل **${anime.title}**.`, flags: MessageFlags.Ephemeral });
      }
    }
  } catch (error) {
    console.error("Interaction error:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ حدث خطأ غير متوقع.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

(async () => {
  await connectDatabase();
  await client.login(process.env.DISCORD_TOKEN);
})();