const blocos = [
  {
    titulo: "Categorias",
    descricao: "Tradicionais, especiais, bebidas, combos e adicionais.",
  },
  {
    titulo: "Preços",
    descricao: "Editar tamanho, borda, adicionais e promoções por loja.",
  },
  {
    titulo: "Fotos e destaque",
    descricao: "Trocar imagens, nome do sabor e mensagem de venda.",
  },
];

export default function ProdutosPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Produtos
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Cardápio da loja</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Esse espaço vai concentrar o CRUD de sabores, tamanhos, preços e
          imagens para cada pizzaria usar a própria operação.
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
