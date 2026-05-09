namespace VoroSalonCrm.Domain.Enums
{
    public enum AppointmentSource
    {
        /// <summary>Criado manualmente pelo painel interno.</summary>
        Internal = 0,

        /// <summary>Criado pelo bot do WhatsApp.</summary>
        WhatsAppBot = 1,

        /// <summary>Criado pelo app mobile público (cliente).</summary>
        App = 2,

        /// <summary>Criado pelo site/booking público.</summary>
        Website = 3,

        /// <summary>Criado pelo Evolution Bot.</summary>
        EvolutionBot = 4,
    }
}
