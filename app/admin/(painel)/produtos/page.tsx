"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";
import { useModalClose } from "@/lib/useModalClose";
import { ConfirmDialog } from "@/lib/ConfirmDialog";
import { FeedbackDialog } from "@/lib/FeedbackDialog";

type TipoProduto = "pizza" | "bebida" | "sobremesa" | "combo" | "adicional";
type TipoFiltro = "todos" | TipoProduto | "bordas";

type Categoria = {
  id: string;
  nome: string;
};

type ProdutoBanco = {
  id: string;
  categoria_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  ativo: boolean | null;
  imagem_url?: string | null;
};

type OpcaoBanco = {
  id?: string;
  produto_id: string;
  nome: string;
  preco: number;
};

type Produto = ProdutoBanco & {
  categoria: string;
  precoInicial: number | null;
  opcoes: OpcaoBanco[];
};

type OpcaoForm = {
  nome: string;
  preco: string;
};

type Borda = {
  id: string;
  nome: string;
  preco: number;
  ordem: number | null;
};

const PRODUTOS_BUCKET = "product-images";

const tipos: { label: string; value: TipoProduto }[] = [
  { label: "Pizza", value: "pizza" },
  { label: "Bebida", value: "bebida" },
  { label: "Sobremesa", value: "sobremesa" },
  { label: "Combo", value: "combo" },
  { label: "Adicionais", value: "adicional" },
];

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function precoNumero(valor: string) {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function rotuloNome(tipo: TipoProduto) {
  if (tipo === "pizza") return "Sabor";
  if (tipo === "adicional") return "Nome do adicional";
  return "Nome do produto";
}

function rotuloTipo(tipo: string | null) {
  const item = tipos.find((tipoItem) => tipoItem.value === tipo);
  return item?.label ?? "Sem tipo";
}

function opcoesIniciais(tipo: TipoProduto = "pizza"): OpcaoForm[] {
  if (tipo === "adicional") return [{ nome: "Unidade", preco: "" }];
  if (tipo === "combo") return [{ nome: "Combo", preco: "" }];
  return [{ nome: "", preco: "" }];
}

function normalizarTipoProduto(tipo: string | null): TipoProduto {
  if (
    tipo === "pizza" ||
    tipo === "bebida" ||
    tipo === "sobremesa" ||
    tipo === "combo" ||
    tipo === "adicional"
  ) {
    return tipo;
  }

  return "pizza";
}

function mensagemErroProduto(mensagem?: string) {
  if (!mensagem) return "Não foi possível salvar o produto.";

  if (
    mensagem.includes("permission denied") ||
    mensagem.includes("violates row-level security")
  ) {
    return "O Supabase bloqueou a gravação. Rode o SQL de permissões/policies no Supabase e tente novamente.";
  }

  if (mensagem.includes("violates check constraint")) {
    return "O banco ainda não aceita este tipo de produto. Rode o SQL atualizado para liberar sobremesa, combo e adicionais.";
  }

  if (mensagem.includes("imagem_url")) {
    return "Para salvar foto, adicione a coluna imagem_url na tabela produtos.";
  }

  return mensagem;
}

export default function ProdutosPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [bordas, setBordas] = useState<Borda[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [erroProdutos, setErroProdutos] = useState("");

  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");

  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [produtoParaExcluir, setProdutoParaExcluir] =
    useState<Produto | null>(null);

  const [modalBordaAberto, setModalBordaAberto] = useState(false);
  const [bordaEditando, setBordaEditando] = useState<Borda | null>(null);
  const [bordaParaExcluir, setBordaParaExcluir] = useState<Borda | null>(null);
  const [nomeBorda, setNomeBorda] = useState("");
  const [precoBorda, setPrecoBorda] = useState("");

  const [erroModal, setErroModal] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [salvandoBorda, setSalvandoBorda] = useState(false);
  const [excluindoBorda, setExcluindoBorda] = useState(false);

  const [tipo, setTipo] = useState<TipoProduto>("pizza");
  const [categoriaId, setCategoriaId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoForm[]>(opcoesIniciais());
  const [comboProdutoIds, setComboProdutoIds] = useState<string[]>([]);

  const [refreshKey, setRefreshKey] = useState(0);

  const modalRef = useRef<HTMLFormElement | null>(null);
  const modalBordaRef = useRef<HTMLFormElement | null>(null);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setProdutoEditando(null);
    setTipo("pizza");
    setCategoriaId("");
    setNome("");
    setDescricao("");
    setFotoUrl("");
    setFotoArquivo(null);
    setFotoPreview("");
    setOpcoes(opcoesIniciais());
    setComboProdutoIds([]);
    setSalvando(false);
  }, []);

  const fecharModalBorda = useCallback(() => {
    setModalBordaAberto(false);
    setBordaEditando(null);
    setNomeBorda("");
    setPrecoBorda("");
    setSalvandoBorda(false);
  }, []);

  useModalClose(modalAberto && !erroModal, fecharModal, modalRef);
  useModalClose(modalBordaAberto && !erroModal, fecharModalBorda, modalBordaRef);

  useEffect(() => {
    async function carregarProdutos() {
      if (!pizzaria) return;

      setCarregandoProdutos(true);
      setErroProdutos("");

      const [
        categoriasResult,
        produtosComImagemResult,
        opcoesResult,
        bordasResult,
      ] = await Promise.all([
        supabase
          .from("categorias")
          .select("id, nome")
          .eq("pizzaria_id", pizzaria.id)
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase
          .from("produtos")
          .select("id, categoria_id, nome, descricao, tipo, ativo, imagem_url")
          .eq("pizzaria_id", pizzaria.id)
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase
          .from("produto_opcoes")
          .select("id, produto_id, nome, preco")
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase
          .from("bordas")
          .select("id, nome, preco, ordem")
          .eq("pizzaria_id", pizzaria.id)
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
      ]);

      const produtosResult = produtosComImagemResult.error?.message.includes(
        "imagem_url"
      )
        ? await supabase
            .from("produtos")
            .select("id, categoria_id, nome, descricao, tipo, ativo")
            .eq("pizzaria_id", pizzaria.id)
            .eq("ativo", true)
            .order("ordem", { ascending: true })
        : produtosComImagemResult;

      if (
        categoriasResult.error ||
        produtosResult.error ||
        opcoesResult.error ||
        bordasResult.error
      ) {
        setErroProdutos("Não foi possível carregar os produtos do banco.");
        setCarregandoProdutos(false);
        return;
      }

      const categoriasData = (categoriasResult.data ?? []) as Categoria[];
      const categoriasPorId = new Map(
        categoriasData.map((categoria) => [categoria.id, categoria.nome])
      );

      const opcoesPorProduto = ((opcoesResult.data ?? []) as OpcaoBanco[]).reduce(
        (mapa, opcao) => {
          const opcoesAtuais = mapa.get(opcao.produto_id) ?? [];

          opcoesAtuais.push({
            ...opcao,
            preco: Number(opcao.preco),
          });

          mapa.set(opcao.produto_id, opcoesAtuais);
          return mapa;
        },
        new Map<string, OpcaoBanco[]>()
      );

      setCategorias(categoriasData);

      setProdutos(
        ((produtosResult.data ?? []) as ProdutoBanco[]).map((produto) => {
          const produtoOpcoes = opcoesPorProduto.get(produto.id) ?? [];
          const precos = produtoOpcoes.map((opcao) => Number(opcao.preco));

          return {
            ...produto,
            categoria: produto.categoria_id
              ? categoriasPorId.get(produto.categoria_id) ?? "Sem categoria"
              : "Sem categoria",
            precoInicial: precos.length > 0 ? Math.min(...precos) : null,
            opcoes: produtoOpcoes,
          };
        })
      );

      setBordas(
        ((bordasResult.data ?? []) as Borda[]).map((borda) => ({
          ...borda,
          preco: Number(borda.preco),
        }))
      );

      setCarregandoProdutos(false);
    }

    carregarProdutos();
  }, [pizzaria, refreshKey]);

  const produtosFiltrados = useMemo(() => {
    if (tipoFiltro === "bordas") return [];
    if (tipoFiltro === "todos") return produtos;
    return produtos.filter((produto) => produto.tipo === tipoFiltro);
  }, [produtos, tipoFiltro]);

  const gruposProdutos = useMemo(() => {
    const mapa = new Map<string, Produto[]>();

    produtosFiltrados.forEach((produto) => {
      const categoria = produto.categoria || "Sem categoria";
      const listaAtual = mapa.get(categoria) ?? [];

      listaAtual.push(produto);
      mapa.set(categoria, listaAtual);
    });

    return Array.from(mapa.entries()).map(([titulo, produtosDoGrupo]) => ({
      titulo,
      produtos: produtosDoGrupo,
    }));
  }, [produtosFiltrados]);


  const produtosParaCombo = useMemo(() => {
    return produtos.filter((produto) => {
      if (produtoEditando?.id === produto.id) return false;
      return produto.tipo !== "combo" && produto.tipo !== "adicional";
    });
  }, [produtoEditando, produtos]);

  function mostrarErro(mensagem: string) {
    setErroProdutos(mensagem);
    setErroModal(mensagem);
  }

  function trocarTipo(novoTipo: TipoProduto) {
    setTipo(novoTipo);
    setOpcoes(opcoesIniciais(novoTipo));

    if (novoTipo !== "combo") {
      setComboProdutoIds([]);
    }
  }

  function abrirNovoProduto() {
    if (tipoFiltro === "bordas") {
      abrirNovaBorda();
      return;
    }

    const tipoInicial = tipoFiltro === "todos" ? "pizza" : tipoFiltro;

    setProdutoEditando(null);
    setTipo(tipoInicial);
    setCategoriaId("");
    setNome("");
    setDescricao("");
    setFotoUrl("");
    setFotoArquivo(null);
    setFotoPreview("");
    setOpcoes(opcoesIniciais(tipoInicial));
    setComboProdutoIds([]);
    setModalAberto(true);
  }

  function abrirEdicaoProduto(produto: Produto) {
    const produtoTipo = normalizarTipoProduto(produto.tipo);

    setProdutoEditando(produto);
    setTipo(produtoTipo);
    setCategoriaId(produto.categoria_id ?? "");
    setNome(produto.nome);
    setDescricao(produto.descricao ?? "");
    setFotoUrl(produto.imagem_url ?? "");
    setFotoArquivo(null);
    setFotoPreview(produto.imagem_url ?? "");
    setComboProdutoIds([]);

    setOpcoes(
      produtoTipo === "adicional" && produto.opcoes.length > 0
        ? [
            {
              nome: "Unidade",
              preco: String(produto.opcoes[0].preco).replace(".", ","),
            },
          ]
        : produto.opcoes.length > 0
          ? produto.opcoes.map((opcao) => ({
              nome: opcao.nome,
              preco: String(opcao.preco).replace(".", ","),
            }))
          : opcoesIniciais(produtoTipo)
    );

    setModalAberto(true);
  }

  function abrirNovaBorda() {
    setBordaEditando(null);
    setNomeBorda("");
    setPrecoBorda("");
    setModalBordaAberto(true);
  }

  function abrirEdicaoBorda(borda: Borda) {
    setBordaEditando(borda);
    setNomeBorda(borda.nome);
    setPrecoBorda(String(borda.preco).replace(".", ","));
    setModalBordaAberto(true);
  }

  function selecionarFoto(arquivo: File | null) {
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      mostrarErro("Selecione um arquivo de imagem.");
      return;
    }

    setFotoArquivo(arquivo);
    setFotoPreview(URL.createObjectURL(arquivo));
  }

  function removerFoto() {
    setFotoArquivo(null);
    setFotoPreview("");
    setFotoUrl("");
  }

  async function uploadFotoProduto(produtoId: string) {
    if (!pizzaria || !fotoArquivo) return fotoUrl.trim() || null;

    const extensao = fotoArquivo.name.split(".").pop()?.toLowerCase() || "jpg";
    const caminho = `${pizzaria.id}/${produtoId}/${crypto.randomUUID()}.${extensao}`;

    const { error } = await supabase.storage
      .from(PRODUTOS_BUCKET)
      .upload(caminho, fotoArquivo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(
        error.message.includes("Bucket not found")
          ? "Bucket product-images não encontrado no Supabase Storage."
          : "Não foi possível enviar a foto."
      );
    }

    const { data } = supabase.storage
      .from(PRODUTOS_BUCKET)
      .getPublicUrl(caminho);

    return data.publicUrl;
  }

  async function obterCategoriaAdicionaisId() {
    if (!pizzaria) return null;

    const categoriaExistente = categorias.find(
      (categoria) => categoria.nome.trim().toLowerCase() === "adicionais"
    );

    if (categoriaExistente) return categoriaExistente.id;

    const { count } = await supabase
      .from("categorias")
      .select("id", { count: "exact", head: true })
      .eq("pizzaria_id", pizzaria.id);

    const { data, error } = await supabase
      .from("categorias")
      .insert({
        pizzaria_id: pizzaria.id,
        nome: "Adicionais",
        ativo: true,
        ordem: (count ?? 0) + 1,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        error?.message.includes("permission denied") ||
          error?.message.includes("row-level security")
          ? "O Supabase bloqueou a criação da categoria Adicionais. Rode o SQL de permissões/policies."
          : "Não foi possível preparar a categoria Adicionais."
      );
    }

    return data.id as string;
  }

  function alterarOpcao(index: number, campo: keyof OpcaoForm, valor: string) {
    setOpcoes((atuais) =>
      atuais.map((opcao, opcaoIndex) =>
        opcaoIndex === index ? { ...opcao, [campo]: valor } : opcao
      )
    );
  }

  function adicionarOpcao() {
    setOpcoes((atuais) => [...atuais, { nome: "", preco: "" }]);
  }

  function removerOpcao(index: number) {
    setOpcoes((atuais) =>
      atuais.filter((_, opcaoIndex) => opcaoIndex !== index)
    );
  }

  async function salvarProduto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pizzaria) return;

    const opcoesParaSalvar =
      tipo === "adicional"
        ? [{ nome: "Unidade", preco: opcoes[0]?.preco ?? "" }]
        : opcoes;

    const opcoesValidas = opcoesParaSalvar
      .map((opcao) => ({
        nome: opcao.nome.trim(),
        preco: precoNumero(opcao.preco),
      }))
      .filter(
        (opcao) =>
          opcao.nome && Number.isFinite(opcao.preco) && opcao.preco > 0
      );

    if (!nome.trim() || opcoesValidas.length === 0) {
      mostrarErro("Informe o nome do produto e pelo menos uma opção com preço.");
      return;
    }

    if (tipo === "combo" && comboProdutoIds.length === 0) {
      mostrarErro("Selecione pelo menos um produto para montar o combo.");
      return;
    }

    setSalvando(true);
    setErroProdutos("");

    let categoriaFinalId = categoriaId || null;

    if (tipo === "adicional") {
      try {
        categoriaFinalId = await obterCategoriaAdicionaisId();
      } catch (categoriaError) {
        mostrarErro(
          categoriaError instanceof Error
            ? categoriaError.message
            : "Não foi possível preparar a categoria Adicionais."
        );
        setSalvando(false);
        return;
      }
    }

    const produtoPayload: Record<string, string | number | boolean | null> = {
      categoria_id: categoriaFinalId,
      nome: nome.trim(),
      descricao: tipo === "adicional" ? null : descricao.trim() || null,
      tipo,
      ativo: true,
      destaque: false,
    };

    if (
      tipo !== "adicional" &&
      !fotoArquivo &&
      (fotoUrl.trim() || produtoEditando?.imagem_url)
    ) {
      produtoPayload.imagem_url = fotoUrl.trim() || null;
    }

    let produtoId = produtoEditando?.id;

    if (produtoEditando) {
      const { error: produtoError } = await supabase
        .from("produtos")
        .update(produtoPayload)
        .eq("id", produtoEditando.id)
        .eq("pizzaria_id", pizzaria.id);

      if (produtoError) {
        mostrarErro(mensagemErroProduto(produtoError.message));
        setSalvando(false);
        return;
      }

      const { error: desativarOpcoesError } = await supabase
        .from("produto_opcoes")
        .update({ ativo: false })
        .eq("produto_id", produtoEditando.id);

      if (desativarOpcoesError) {
        mostrarErro("Produto editado, mas não foi possível atualizar os preços.");
        setSalvando(false);
        return;
      }
    } else {
      const { count } = await supabase
        .from("produtos")
        .select("id", { count: "exact", head: true })
        .eq("pizzaria_id", pizzaria.id);

      const { data: produtoCriado, error: produtoError } = await supabase
        .from("produtos")
        .insert({
          ...produtoPayload,
          pizzaria_id: pizzaria.id,
          ordem: (count ?? 0) + 1,
        })
        .select("id")
        .single();

      if (produtoError || !produtoCriado) {
        mostrarErro(mensagemErroProduto(produtoError?.message));
        setSalvando(false);
        return;
      }

      produtoId = produtoCriado.id;
    }

    if (!produtoId) {
      mostrarErro("Não foi possível identificar o produto salvo.");
      setSalvando(false);
      return;
    }

    if (tipo !== "adicional" && fotoArquivo) {
      try {
        const imagemUrl = await uploadFotoProduto(produtoId);

        const { error: imagemError } = await supabase
          .from("produtos")
          .update({ imagem_url: imagemUrl })
          .eq("id", produtoId)
          .eq("pizzaria_id", pizzaria.id);

        if (imagemError) {
          mostrarErro(
            imagemError.message.includes("imagem_url")
              ? "Foto enviada, mas adicione a coluna imagem_url na tabela produtos para salvar a imagem."
              : "Foto enviada, mas não foi possível vincular a imagem ao produto."
          );
          setSalvando(false);
          return;
        }
      } catch (uploadError) {
        mostrarErro(
          uploadError instanceof Error
            ? uploadError.message
            : "Não foi possível enviar a foto."
        );
        setSalvando(false);
        return;
      }
    }

    const { error: opcoesError } = await supabase.from("produto_opcoes").insert(
      opcoesValidas.map((opcao, index) => ({
        produto_id: produtoId,
        nome: opcao.nome,
        preco: opcao.preco,
        ativo: true,
        ordem: index + 1,
      }))
    );

    if (opcoesError) {
      mostrarErro("Produto salvo, mas não foi possível salvar os preços.");
      setSalvando(false);
      return;
    }

    if (tipo === "combo") {
      const { error: limparComboError } = await supabase
        .from("combo_produtos")
        .delete()
        .eq("combo_id", produtoId);

      if (
        limparComboError &&
        !limparComboError.message.includes("combo_produtos")
      ) {
        mostrarErro(
          "Produto salvo, mas não foi possível atualizar os itens do combo."
        );
        setSalvando(false);
        return;
      }

      const { error: comboError } = await supabase.from("combo_produtos").insert(
        comboProdutoIds.map((produtoIdSelecionado) => ({
          combo_id: produtoId,
          produto_id: produtoIdSelecionado,
        }))
      );

      if (comboError) {
        mostrarErro(
          comboError.message.includes("combo_produtos")
            ? "Para montar combos, crie a tabela combo_produtos no Supabase."
            : "Produto salvo, mas não foi possível salvar os itens do combo."
        );
        setSalvando(false);
        return;
      }
    }

    fecharModal();
    setRefreshKey((atual) => atual + 1);
  }

  async function confirmarExclusaoProduto() {
    if (!pizzaria || !produtoParaExcluir) return;

    setExcluindo(true);

    const { error } = await supabase
      .from("produtos")
      .update({ ativo: false })
      .eq("id", produtoParaExcluir.id)
      .eq("pizzaria_id", pizzaria.id);

    if (error) {
      mostrarErro("Não foi possível excluir o produto.");
      setExcluindo(false);
      return;
    }

    await supabase
      .from("produto_opcoes")
      .update({ ativo: false })
      .eq("produto_id", produtoParaExcluir.id);

    setProdutoParaExcluir(null);
    setExcluindo(false);
    setRefreshKey((atual) => atual + 1);
  }

  async function salvarBorda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pizzaria || !nomeBorda.trim()) return;

    const precoFinal = precoNumero(precoBorda || "0");

    if (!Number.isFinite(precoFinal) || precoFinal < 0) {
      mostrarErro("Informe um preço válido para a borda.");
      return;
    }

    setSalvandoBorda(true);
    setErroProdutos("");

    if (bordaEditando) {
      const { error } = await supabase
        .from("bordas")
        .update({
          nome: nomeBorda.trim(),
          preco: precoFinal,
        })
        .eq("id", bordaEditando.id)
        .eq("pizzaria_id", pizzaria.id);

      if (error) {
        mostrarErro("Não foi possível editar a borda.");
        setSalvandoBorda(false);
        return;
      }
    } else {
      const { count } = await supabase
        .from("bordas")
        .select("id", { count: "exact", head: true })
        .eq("pizzaria_id", pizzaria.id);

      const { error } = await supabase.from("bordas").insert({
        pizzaria_id: pizzaria.id,
        nome: nomeBorda.trim(),
        preco: precoFinal,
        ativo: true,
        ordem: (count ?? 0) + 1,
      });

      if (error) {
        mostrarErro("Não foi possível salvar a borda.");
        setSalvandoBorda(false);
        return;
      }
    }

    fecharModalBorda();
    setRefreshKey((atual) => atual + 1);
  }

  async function confirmarExclusaoBorda() {
    if (!pizzaria || !bordaParaExcluir) return;

    setExcluindoBorda(true);

    const { error } = await supabase
      .from("bordas")
      .update({ ativo: false })
      .eq("id", bordaParaExcluir.id)
      .eq("pizzaria_id", pizzaria.id);

    if (error) {
      mostrarErro("Não foi possível excluir a borda.");
      setExcluindoBorda(false);
      return;
    }

    setBordaParaExcluir(null);
    setExcluindoBorda(false);
    setRefreshKey((atual) => atual + 1);
  }

  function renderTabelaProdutos(titulo: string, listaProdutos: Produto[]) {
    return (
      <section
        key={titulo || "produtos"}
        className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]"
      >
        {titulo && (
          <div className="border-b border-white/10 bg-zinc-950/70 px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[#ffb26a]">
              {titulo}
            </h2>
          </div>
        )}

        <div className="hidden grid-cols-[1.3fr_0.7fr_0.7fr_0.8fr_170px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-500 md:grid">
          <span>Produto</span>
          <span>Tipo</span>
          <span>Categoria</span>
          <span className="text-right">Preço inicial</span>
          <span className="text-right">Ações</span>
        </div>

        {listaProdutos.map((produto) => (
          <article
            key={produto.id}
            className="grid grid-cols-1 gap-4 border-b border-white/10 px-5 py-4 last:border-b-0 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.8fr_170px] md:items-center"
          >
            <div>
              <h3 className="text-base font-black text-white">{produto.nome}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-400">
                {produto.descricao ?? "Sem descrição cadastrada"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:contents">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                  Tipo
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-200 md:mt-0">
                  {rotuloTipo(produto.tipo)}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                  Categoria
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-300 md:mt-0">
                  {produto.categoria}
                </p>
              </div>

              <div className="col-span-2 md:col-span-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                  Preço inicial
                </p>
                <p className="mt-1 text-left text-lg font-black text-white md:mt-0 md:text-right">
                  {produto.precoInicial === null
                    ? "Sem preço"
                    : dinheiro(produto.precoInicial)}
                </p>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-2 md:col-span-1 md:flex md:justify-end">
                <button
                  type="button"
                  onClick={() => abrirEdicaoProduto(produto)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-100"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => setProdutoParaExcluir(produto)}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200"
                >
                  Excluir
                </button>
              </div>
            </div>
          </article>
        ))}

        {!carregandoProdutos && listaProdutos.length === 0 && (
          <div className="p-5 text-sm font-bold text-zinc-300">
            Nenhum produto encontrado.
          </div>
        )}
      </section>
    );
  }

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando produtos...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
              Produtos
            </p>

            <h1 className="mt-3 text-3xl font-black text-white">Cardápio</h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              Cadastre pizzas, bebidas, sobremesas, combos e adicionais da operação.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovoProduto}
            className="rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff6a26]"
          >
            {tipoFiltro === "bordas" ? "+ Adicionar borda" : "+ Adicionar produto"}
          </button>
        </div>
      </section>

      {(erro || erroProdutos) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro || erroProdutos}
        </div>
      )}

      {pizzaria && (
        <>


          <section className="flex gap-2 overflow-x-auto pb-1">
            {[
              { label: "Todos", value: "todos" as const },
              ...tipos,
              { label: "Bordas", value: "bordas" as const },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTipoFiltro(item.value)}
                className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-black transition ${
                  tipoFiltro === item.value
                    ? "bg-white text-[#1f120d]"
                    : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </section>

          {tipoFiltro === "bordas" ? (
            <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
              <div className="hidden grid-cols-[1fr_0.8fr_170px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-500 md:grid">
                <span>Borda</span>
                <span className="text-right">Preço</span>
                <span className="text-right">Ações</span>
              </div>

              {bordas.map((borda) => (
                <article
                  key={borda.id}
                  className="grid grid-cols-1 gap-4 border-b border-white/10 px-5 py-4 last:border-b-0 md:grid-cols-[1fr_0.8fr_170px] md:items-center"
                >
                  <div>
                    <h2 className="text-base font-black text-white">
                      {borda.nome}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      Ordem {borda.ordem ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                      Preço
                    </p>
                    <p className="mt-1 text-left text-lg font-black text-white md:mt-0 md:text-right">
                      {dinheiro(borda.preco)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
                    <button
                      type="button"
                      onClick={() => abrirEdicaoBorda(borda)}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-100"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => setBordaParaExcluir(borda)}
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200"
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}

              {!carregandoProdutos && bordas.length === 0 && (
                <div className="p-5 text-sm font-bold text-zinc-300">
                  Nenhuma borda cadastrada.
                </div>
              )}
            </section>
          ) : tipoFiltro === "todos" ? (
            produtosFiltrados.length === 0 ? (
              renderTabelaProdutos("", [])
            ) : (
              <div className="space-y-5">
                {gruposProdutos.map((grupo) =>
                  renderTabelaProdutos(grupo.titulo, grupo.produtos)
                )}
              </div>
            )
          ) : (
            renderTabelaProdutos("", produtosFiltrados)
          )}
        </>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <form
            ref={modalRef}
            onSubmit={salvarProduto}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] border border-white/10 bg-[#140f0d] p-5 shadow-2xl sm:max-w-2xl sm:rounded-[32px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
                  {produtoEditando ? "Editar produto" : "Novo produto"}
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  {produtoEditando
                    ? "Editar item do cardápio"
                    : "Adicionar ao cardápio"}
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-200"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">
                  Tipo
                </span>
                <select
                  value={tipo}
                  onChange={(event) =>
                    trocarTipo(event.target.value as TipoProduto)
                  }
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                >
                  {tipos.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {tipo !== "adicional" && (
                <label>
                  <span className="mb-2 block text-sm font-black text-zinc-200">
                    Categoria
                  </span>
                  <select
                    value={categoriaId}
                    onChange={(event) => setCategoriaId(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                  >
                    <option value="">Sem categoria</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">
                  {rotuloNome(tipo)}
                </span>
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
              </label>

              {tipo !== "adicional" && (
                <>
                  <label>
                    <span className="mb-2 block text-sm font-black text-zinc-200">
                      Descrição
                    </span>
                    <input
                      value={descricao}
                      onChange={(event) => setDescricao(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <span className="mb-2 block text-sm font-black text-zinc-200">
                      Foto do produto
                    </span>

                    <div className="grid gap-3 rounded-3xl border border-white/10 bg-[#0f0c0b] p-3 sm:grid-cols-[140px_1fr]">
                      <div className="grid aspect-[1.2] place-items-center overflow-hidden rounded-2xl bg-white/[0.04]">
                        {fotoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={fotoPreview}
                            alt="Prévia da foto"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="px-4 text-center text-xs font-bold leading-5 text-zinc-500">
                            Sem foto
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col justify-center gap-2">
                        <label className="grid h-12 cursor-pointer place-items-center rounded-2xl bg-[#ff7a3d] px-4 text-sm font-black text-white transition hover:bg-[#ff6a26]">
                          Escolher foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) =>
                              selecionarFoto(event.target.files?.[0] ?? null)
                            }
                          />
                        </label>

                        {(fotoPreview || fotoUrl) && (
                          <button
                            type="button"
                            onClick={removerFoto}
                            className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-zinc-200"
                          >
                            Remover foto
                          </button>
                        )}

                        <span className="text-xs font-bold leading-5 text-zinc-500">
                          Use uma imagem quadrada ou horizontal. No celular, este
                          botão abre a galeria.
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {tipo === "combo" && (
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black text-zinc-200">
                    Produtos do combo
                  </h3>
                  <p className="text-xs font-bold leading-5 text-zinc-500">
                    Selecione os itens existentes que fazem parte deste combo.
                  </p>
                </div>

                <div className="mt-4 grid gap-2">
                  {produtosParaCombo.map((produto) => {
                    const selecionado = comboProdutoIds.includes(produto.id);

                    return (
                      <label
                        key={produto.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                          selecionado
                            ? "border-[#ff7a3d] bg-[#ff7a3d]/15"
                            : "border-white/10 bg-[#0f0c0b]"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-black text-white">
                            {produto.nome}
                          </span>
                          <span className="mt-1 block text-xs font-bold capitalize text-zinc-500">
                            {rotuloTipo(produto.tipo)} · {produto.categoria}
                          </span>
                        </span>

                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={(event) => {
                            setComboProdutoIds((atuais) =>
                              event.target.checked
                                ? [...atuais, produto.id]
                                : atuais.filter((id) => id !== produto.id)
                            );
                          }}
                          className="h-5 w-5 accent-[#ff7a3d]"
                        />
                      </label>
                    );
                  })}

                  {produtosParaCombo.length === 0 && (
                    <p className="rounded-2xl border border-white/10 bg-[#0f0c0b] p-4 text-sm font-bold text-zinc-400">
                      Cadastre pizzas, bebidas ou sobremesas antes de montar um
                      combo.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-zinc-200">
                  {tipo === "adicional"
                    ? "Preço do adicional"
                    : tipo === "combo"
                      ? "Preço do combo"
                      : "Tamanhos, variações e preços"}
                </h3>

                {tipo !== "combo" && tipo !== "adicional" && (
                  <button
                    type="button"
                    onClick={adicionarOpcao}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-200"
                  >
                    + Opção
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {opcoes.map((opcao, index) => (
                  <div
                    key={index}
                    className={`grid gap-2 ${
                      tipo === "adicional" ? "" : "sm:grid-cols-[1fr_120px_auto]"
                    }`}
                  >
                    {tipo !== "adicional" && (
                      <input
                        value={opcao.nome}
                        onChange={(event) =>
                          alterarOpcao(index, "nome", event.target.value)
                        }
                        placeholder="Especificações"
                        required
                        className="h-12 rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                      />
                    )}

                    <input
                      value={opcao.preco}
                      onChange={(event) =>
                        alterarOpcao(index, "preco", event.target.value)
                      }
                      placeholder="49,90"
                      required
                      className="h-12 rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                    />

                    {tipo !== "adicional" && (
                      <button
                        type="button"
                        onClick={() => removerOpcao(index)}
                        disabled={opcoes.length === 1}
                        className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-black text-zinc-300 disabled:opacity-40"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="mt-6 w-full rounded-2xl bg-[#ff7a3d] px-5 py-4 text-sm font-black text-white transition hover:bg-[#ff6a26] disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar produto"}
            </button>
          </form>
        </div>
      )}

      {modalBordaAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <form
            ref={modalBordaRef}
            onSubmit={salvarBorda}
            className="w-full rounded-t-[32px] border border-white/10 bg-[#140f0d] p-5 shadow-2xl sm:max-w-lg sm:rounded-[32px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
                  {bordaEditando ? "Editar borda" : "Nova borda"}
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  {bordaEditando ? "Editar borda" : "Adicionar borda"}
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModalBorda}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-200"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_140px]">
              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">
                  Nome
                </span>
                <input
                  value={nomeBorda}
                  onChange={(event) => setNomeBorda(event.target.value)}
                  placeholder="Ex: Catupiry"
                  required
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">
                  Preço
                </span>
                <input
                  value={precoBorda}
                  onChange={(event) => setPrecoBorda(event.target.value)}
                  placeholder="8,00"
                  required
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={salvandoBorda}
              className="mt-6 w-full rounded-2xl bg-[#ff7a3d] px-5 py-4 text-sm font-black text-white transition hover:bg-[#ff6a26] disabled:opacity-60"
            >
              {salvandoBorda ? "Salvando..." : "Salvar borda"}
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        aberto={Boolean(produtoParaExcluir)}
        titulo="Excluir produto?"
        descricao={`O produto "${
          produtoParaExcluir?.nome ?? ""
        }" sairá do cardápio, mas o histórico permanece preservado.`}
        confirmando={excluindo}
        onCancelar={() => setProdutoParaExcluir(null)}
        onConfirmar={confirmarExclusaoProduto}
      />

      <ConfirmDialog
        aberto={Boolean(bordaParaExcluir)}
        titulo="Excluir borda?"
        descricao={`A borda "${
          bordaParaExcluir?.nome ?? ""
        }" deixará de aparecer para novas pizzas.`}
        confirmando={excluindoBorda}
        onCancelar={() => setBordaParaExcluir(null)}
        onConfirmar={confirmarExclusaoBorda}
      />

      <FeedbackDialog
        aberto={Boolean(erroModal)}
        titulo="Não foi possível salvar"
        descricao={erroModal}
        onFechar={() => setErroModal("")}
      />
    </div>
  );
}