import Link from "next/link";

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#f8f5ef] px-4 py-8 text-[#1b120c]">
      <article className="mx-auto max-w-3xl rounded-[28px] border border-[#eadfcc] bg-[#fffaf2] p-5 shadow-[0_24px_90px_rgba(43,23,12,0.08)] sm:p-8">
        <Link href="/" className="text-xs font-black uppercase tracking-[0.16em] text-[#d14f2a]">
          Voltar ao cardápio
        </Link>

        <h1 className="mt-5 font-serif text-3xl font-black sm:text-4xl">
          Política de privacidade
        </h1>

        <p className="mt-4 text-sm font-semibold leading-6 text-[#6d5a4a]">
          Esta política explica, de forma simples, como a Casa Di Lari usa os
          dados informados pelo cliente ao fazer um pedido pelo cardápio online.
        </p>

        <section className="mt-7 space-y-3">
          <h2 className="text-lg font-black">Quais dados usamos</h2>
          <p className="text-sm font-semibold leading-6 text-[#6d5a4a]">
            Podemos coletar nome, WhatsApp, endereço de entrega, bairro, ponto
            de referência, itens do pedido, observações, forma de pagamento e
            status do pedido.
          </p>
        </section>

        <section className="mt-7 space-y-3">
          <h2 className="text-lg font-black">Para que usamos</h2>
          <p className="text-sm font-semibold leading-6 text-[#6d5a4a]">
            Esses dados são usados somente para preparar o pedido, entrar em
            contato pelo WhatsApp, combinar entrega ou retirada e consultar o
            andamento do pedido pelo protocolo.
          </p>
        </section>

        <section className="mt-7 space-y-3">
          <h2 className="text-lg font-black">Quem acessa</h2>
          <p className="text-sm font-semibold leading-6 text-[#6d5a4a]">
            As informações ficam disponíveis para a loja e para as pessoas
            responsáveis pelo atendimento, preparo e entrega dos pedidos.
          </p>
        </section>

        <section className="mt-7 space-y-3">
          <h2 className="text-lg font-black">Armazenamento</h2>
          <p className="text-sm font-semibold leading-6 text-[#6d5a4a]">
            Os pedidos podem ficar salvos para controle da loja, histórico de
            atendimento e conferência. A loja deve manter apenas o necessário
            para essas finalidades.
          </p>
        </section>

        <section className="mt-7 space-y-3">
          <h2 className="text-lg font-black">Cookies e tecnologias parecidas</h2>
          <p className="text-sm font-semibold leading-6 text-[#6d5a4a]">
            O cardápio pode usar armazenamento local do navegador para manter
            informações essenciais de funcionamento, como carrinho, configuração
            da loja e pedidos em andamento. Não usamos isso para anúncios ou
            rastreamento de marketing.
          </p>
        </section>

        <section className="mt-7 space-y-3">
          <h2 className="text-lg font-black">Correção ou exclusão</h2>
          <p className="text-sm font-semibold leading-6 text-[#6d5a4a]">
            Se quiser corrigir ou pedir a exclusão de alguma informação, entre
            em contato com a Casa Di Lari pelo WhatsApp informado no cardápio.
          </p>
        </section>

        <p className="mt-8 rounded-2xl bg-[#fff8ea] p-4 text-xs font-bold leading-5 text-[#8b7866]">
          Última atualização: julho de 2026.
        </p>
      </article>
    </main>
  );
}
