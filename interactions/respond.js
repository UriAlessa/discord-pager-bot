module.exports = {
    async execute(interaction) {
      const time = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
      await interaction.reply({
        content: `🟢 **En camino:** ${interaction.user.tag} — ${time}`,
        ephemeral: false,
      });
    }
  };
  