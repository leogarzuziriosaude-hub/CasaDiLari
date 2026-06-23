const blocos = [
  {
    titulo: "Loja aberta",
    descricao: "Ligar e desligar atendimento em poucos toques.",
  },
  {
    titulo: "Tempo de entrega",
    descricao: "Editar prazo mínimo e máximo para cada região.",
  },
  {
    titulo: "Canais",
    descricao: "WhatsApp, taxas, retirada e regras de encomenda.",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Configurações
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Ajustes da pizzaria</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Área para mudar disponibilidade, horário, WhatsApp, entrega e regras de
          funcionamento por unidade.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {blocos.map((bloco) => (
          <article
            key={bloco.titulo}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
          >
            <h2 className="text-lg font-black text-white">{bloco.titulo}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{bloco.descricao}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
