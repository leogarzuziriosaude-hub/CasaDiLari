const cards = [
  {
    titulo: "Fila ativa",
    descricao: "Pedidos novos, em preparo e aguardando saída.",
  },
  {
    titulo: "Tempo de resposta",
    descricao: "Acompanhe demora por canal e por período do dia.",
  },
  {
    titulo: "Ações rápidas",
    descricao: "Aceitar, cancelar, reimprimir e atualizar status.",
  },
];

export default function PedidosPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Pedidos
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Fila de pedidos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Aqui entra a tela principal de operação do dono: pedidos chegando,
          status, observações e ações rápidas de cozinha e entrega.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.titulo}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
          >
            <h2 className="text-lg font-black text-white">{card.titulo}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{card.descricao}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
