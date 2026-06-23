const blocos = [
  {
    titulo: "Agendamentos",
    descricao: "Pedidos futuros para datas e horários escolhidos.",
  },
  {
    titulo: "Regras",
    descricao: "Janela de produção, limite por horário e bloqueios.",
  },
  {
    titulo: "Notificações",
    descricao: "Alertas para equipe quando a encomenda entrar na fila.",
  },
];

export default function EncomendasPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Encomendas
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Pedidos programados</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Aqui entram os pedidos agendados e as regras de atendimento para cada
          unidade da rede.
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
