const blocos = [
  {
    titulo: "Conversão",
    descricao: "Quantos visitantes viraram pedidos hoje.",
  },
  {
    titulo: "Ticket médio",
    descricao: "Preço médio por pedido e por canal de venda.",
  },
  {
    titulo: "Produtos mais fortes",
    descricao: "Sabores, combos e adicionais que vendem mais.",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Leitura rápida da loja</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Visão executiva para acompanhar resultado, operação e pontos de atenção
          da pizzaria sem depender de planilhas soltas.
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
