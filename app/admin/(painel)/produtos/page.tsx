"use client";

import {
  FormEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";
import { useModalClose } from "@/lib/useModalClose";
import { ConfirmDialog } from "@/lib/ConfirmDialog";
import { FeedbackDialog } from "@/lib/FeedbackDialog";

type TipoProduto = "pizza" | "bebida" | "sobremesa" | "combo" | "adicional";
type FiltroCardapio = "todos" | "bordas" | string;

type Categoria = {
  id: string;
  nome: string;
  ordem?: number | null;
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
  comboProdutoIds?: string[];
  comboProdutoOpcoes?: Record<string, string>;
  comboDescontoTipo?: "percentual" | "valor";
  comboDescontoValor?: number | null;
  comboPrecoOriginal?: number | null;
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

function categoriasLocaisKey(pizzariaId: string) {
  return `casadilari:categorias:${pizzariaId}`;
}

function produtosLocaisKey(pizzariaId: string) {
  return `casadilari:produtos:${pizzariaId}`;
}

function bordasLocaisKey(pizzariaId: string) {
  return `casadilari:bordas:${pizzariaId}`;
}

function carregarCategoriasLocais(pizzariaId: string): Categoria[] {
  if (typeof window === "undefined") return [];

  try {
    const valor = window.localStorage.getItem(categoriasLocaisKey(pizzariaId));
    return valor ? (JSON.parse(valor) as Categoria[]) : [];
  } catch {
    return [];
  }
}

function carregarProdutosLocais(pizzariaId: string): Produto[] {
  if (typeof window === "undefined") return [];

  try {
    const valor = window.localStorage.getItem(produtosLocaisKey(pizzariaId));
    return valor ? (JSON.parse(valor) as Produto[]) : [];
  } catch {
    return [];
  }
}

function salvarProdutosLocais(pizzariaId: string, produtos: Produto[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(produtosLocaisKey(pizzariaId), JSON.stringify(produtos));
}

function salvarCategoriasLocais(pizzariaId: string, categorias: Categoria[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(categoriasLocaisKey(pizzariaId), JSON.stringify(categorias));
}

function carregarBordasLocais(pizzariaId: string): Borda[] {
  if (typeof window === "undefined") return [];

  try {
    const valor = window.localStorage.getItem(bordasLocaisKey(pizzariaId));
    return valor ? (JSON.parse(valor) as Borda[]) : [];
  } catch {
    return [];
  }
}

function salvarBordasLocais(pizzariaId: string, bordas: Borda[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(bordasLocaisKey(pizzariaId), JSON.stringify(bordas));
}

function ordenarCategorias(categorias: Categoria[]) {
  return [...categorias].sort((categoriaA, categoriaB) => {
    const ordemA = categoriaA.ordem ?? Number.MAX_SAFE_INTEGER;
    const ordemB = categoriaB.ordem ?? Number.MAX_SAFE_INTEGER;

    if (ordemA !== ordemB) return ordemA - ordemB;
    return categoriaA.nome.localeCompare(categoriaB.nome);
  });
}

function normalizarOrdemCategorias(categorias: Categoria[]) {
  return categorias.map((categoria, index) => ({
    ...categoria,
    ordem: index + 1,
  }));
}

function arquivoParaDataUrl(arquivo: File) {
  return new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => resolve(String(leitor.result ?? ""));
    leitor.onerror = () => reject(new Error("Nao foi possivel ler a foto."));
    leitor.readAsDataURL(arquivo);
  });
}

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function precoNumero(valor: string) {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function categoriaEhAdicional(nomeCategoria: string) {
  const palavras = normalizarTexto(nomeCategoria).split(/[^a-z0-9]+/).filter(Boolean);
  return palavras.some((palavra) => palavra === "adicional" || palavra === "adicionais");
}

function categoriaEhCombo(nomeCategoria: string) {
  const palavras = normalizarTexto(nomeCategoria).split(/[^a-z0-9]+/).filter(Boolean);
  return palavras.some((palavra) => palavra === "combo" || palavra === "combos");
}

function categoriaEhPizza(nomeCategoria: string) {
  const palavras = normalizarTexto(nomeCategoria).split(/[^a-z0-9]+/).filter(Boolean);
  return palavras.some((palavra) => palavra === "pizza" || palavra === "pizzas");
}

function inferirTipoTecnico(nomeCategoria: string): TipoProduto {
  const categoriaNormalizada = normalizarTexto(nomeCategoria);

  if (categoriaNormalizada.includes("bebida")) return "bebida";
  if (categoriaNormalizada.includes("sobremesa")) return "sobremesa";
  if (categoriaEhCombo(nomeCategoria)) return "combo";
  if (categoriaEhAdicional(nomeCategoria)) return "adicional";

  return "pizza";
}

function opcoesIniciais(categoria = ""): OpcaoForm[] {
  if (categoriaEhAdicional(categoria)) return [{ nome: "Unidade", preco: "" }];
  if (categoriaEhCombo(categoria)) return [];
  return [{ nome: "", preco: "" }];
}


export default function ProdutosPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [bordas, setBordas] = useState<Borda[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [erroProdutos, setErroProdutos] = useState("");

  const [filtroCardapio, setFiltroCardapio] = useState<FiltroCardapio>("todos");

  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [produtoParaExcluir, setProdutoParaExcluir] =
    useState<Produto | null>(null);
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [modalOrganizarCategoriasAberto, setModalOrganizarCategoriasAberto] = useState(false);
  const [categoriaArrastandoId, setCategoriaArrastandoId] = useState<string | null>(null);
  const [categoriaDestinoId, setCategoriaDestinoId] = useState<string | null>(null);
  const [nomeCategoria, setNomeCategoria] = useState("");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);

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

  const [categoriaId, setCategoriaId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoForm[]>(opcoesIniciais());
  const [comboProdutoIds, setComboProdutoIds] = useState<string[]>([]);
  const [comboProdutoOpcoes, setComboProdutoOpcoes] = useState<Record<string, string>>({});
  const [comboCategoriaAberta, setComboCategoriaAberta] = useState<string | null>(null);
  const [comboDescontoTipo, setComboDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [comboDescontoValor, setComboDescontoValor] = useState("");


  const modalRef = useRef<HTMLFormElement | null>(null);
  const modalBordaRef = useRef<HTMLFormElement | null>(null);
  const modalCategoriaRef = useRef<HTMLFormElement | null>(null);
  const modalOrganizarCategoriasRef = useRef<HTMLDivElement | null>(null);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setProdutoEditando(null);
    setCategoriaId("");
    setNome("");
    setDescricao("");
    setFotoUrl("");
    setFotoArquivo(null);
    setFotoPreview("");
    setOpcoes(opcoesIniciais());
    setComboProdutoIds([]);
    setComboProdutoOpcoes({});
    setComboCategoriaAberta(null);
    setComboDescontoTipo("percentual");
    setComboDescontoValor("");
    setSalvando(false);
  }, []);

  const fecharModalBorda = useCallback(() => {
    setModalBordaAberto(false);
    setBordaEditando(null);
    setNomeBorda("");
    setPrecoBorda("");
    setSalvandoBorda(false);
  }, []);

  const fecharModalCategoria = useCallback(() => {
    setModalCategoriaAberto(false);
    setNomeCategoria("");
    setSalvandoCategoria(false);
  }, []);

  const fecharModalOrganizarCategorias = useCallback(() => {
    setModalOrganizarCategoriasAberto(false);
    setCategoriaArrastandoId(null);
    setCategoriaDestinoId(null);
  }, []);

  useModalClose(modalAberto && !erroModal, fecharModal, modalRef);
  useModalClose(modalBordaAberto && !erroModal, fecharModalBorda, modalBordaRef);
  useModalClose(modalCategoriaAberto && !erroModal, fecharModalCategoria, modalCategoriaRef);
  useModalClose(
    modalOrganizarCategoriasAberto,
    fecharModalOrganizarCategorias,
    modalOrganizarCategoriasRef
  );

  useEffect(() => {
    function carregarProdutos() {
      if (!pizzaria) return;

      setCarregandoProdutos(true);
      setErroProdutos("");

      const categoriasData = ordenarCategorias(carregarCategoriasLocais(pizzaria.id));
      setCategorias(categoriasData);
      setProdutos(carregarProdutosLocais(pizzaria.id));
      setBordas(carregarBordasLocais(pizzaria.id));
      setCarregandoProdutos(false);
    }

    carregarProdutos();
  }, [pizzaria]);

  const categoriasOrdenadas = useMemo(() => {
    return ordenarCategorias(categorias);
  }, [categorias]);

  const produtosFiltrados = useMemo(() => {
    if (filtroCardapio === "bordas") return [];
    if (filtroCardapio === "todos") return produtos;
    return produtos.filter((produto) => produto.categoria_id === filtroCardapio);
  }, [filtroCardapio, produtos]);

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
      return !categoriaEhCombo(produto.categoria) && !categoriaEhAdicional(produto.categoria);
    });
  }, [produtoEditando, produtos]);

  const produtosSelecionadosCombo = useMemo(() => {
    return produtosParaCombo.filter((produto) => comboProdutoIds.includes(produto.id));
  }, [comboProdutoIds, produtosParaCombo]);

  const gruposProdutosParaCombo = useMemo(() => {
    const mapa = new Map<string, Produto[]>();

    produtosParaCombo.forEach((produto) => {
      const lista = mapa.get(produto.categoria) ?? [];
      lista.push(produto);
      mapa.set(produto.categoria, lista);
    });

    return Array.from(mapa.entries()).map(([categoria, produtosDoGrupo]) => ({
      categoria,
      produtos: produtosDoGrupo,
    }));
  }, [produtosParaCombo]);

  const comboSubtotal = useMemo(() => {
    return produtosSelecionadosCombo.reduce(
      (subtotal, produto) => {
        const opcaoSelecionadaId = comboProdutoOpcoes[produto.id];
        const opcaoSelecionada =
          produto.opcoes.find((opcao) => opcao.id === opcaoSelecionadaId) ??
          produto.opcoes[0];

        return subtotal + Number(opcaoSelecionada?.preco ?? produto.precoInicial ?? 0);
      },
      0
    );
  }, [comboProdutoOpcoes, produtosSelecionadosCombo]);

  const comboDescontoNumero = precoNumero(comboDescontoValor || "0");
  const comboPrecoCalculado = useMemo(() => {
    if (Number.isFinite(comboDescontoNumero) && comboDescontoNumero > 0) {
      const desconto =
        comboDescontoTipo === "percentual"
          ? comboSubtotal * (comboDescontoNumero / 100)
          : comboDescontoNumero;

      return Math.max(0, comboSubtotal - desconto);
    }

    return comboSubtotal;
  }, [comboDescontoNumero, comboDescontoTipo, comboSubtotal]);

  const categoriaSelecionada = useMemo(() => {
    return categorias.find((categoria) => categoria.id === categoriaId) ?? null;
  }, [categoriaId, categorias]);

  const categoriaSelecionadaNome = categoriaSelecionada?.nome ?? "";
  const categoriaSelecionadaEhAdicional = categoriaEhAdicional(categoriaSelecionadaNome);
  const categoriaSelecionadaEhCombo = categoriaEhCombo(categoriaSelecionadaNome);

  function mostrarErro(mensagem: string) {
    setErroProdutos(mensagem);
    setErroModal(mensagem);
  }

  function abrirNovaCategoria() {
    setNomeCategoria("");
    setModalCategoriaAberto(true);
  }

  function salvarCategoriasOrdenadas(proximasCategorias: Categoria[]) {
    if (!pizzaria) return;

    const categoriasNormalizadas = normalizarOrdemCategorias(proximasCategorias);
    setCategorias(categoriasNormalizadas);
    salvarCategoriasLocais(pizzaria.id, categoriasNormalizadas);
  }

  function moverCategoria(categoriaId: string, direcao: -1 | 1) {
    const categoriasAtuais = ordenarCategorias(categorias);
    const indexAtual = categoriasAtuais.findIndex((categoria) => categoria.id === categoriaId);
    const proximoIndex = indexAtual + direcao;

    if (indexAtual < 0 || proximoIndex < 0 || proximoIndex >= categoriasAtuais.length) return;

    const proximasCategorias = [...categoriasAtuais];
    const categoriaAtual = proximasCategorias[indexAtual];
    proximasCategorias[indexAtual] = proximasCategorias[proximoIndex];
    proximasCategorias[proximoIndex] = categoriaAtual;

    salvarCategoriasOrdenadas(proximasCategorias);
  }

  function moverCategoriaPara(categoriaId: string, destinoId: string) {
    const categoriasAtuais = ordenarCategorias(categorias);
    const indexAtual = categoriasAtuais.findIndex((categoria) => categoria.id === categoriaId);
    const indexDestino = categoriasAtuais.findIndex((categoria) => categoria.id === destinoId);

    if (indexAtual < 0 || indexDestino < 0 || indexAtual === indexDestino) return;

    const proximasCategorias = [...categoriasAtuais];
    const [categoriaMovida] = proximasCategorias.splice(indexAtual, 1);
    const novoIndexDestino = proximasCategorias.findIndex(
      (categoria) => categoria.id === destinoId
    );

    if (novoIndexDestino < 0) return;

    proximasCategorias.splice(novoIndexDestino, 0, categoriaMovida);
    salvarCategoriasOrdenadas(proximasCategorias);
  }

  function categoriaNoPonto(clientX: number, clientY: number) {
    const elementos = document.elementsFromPoint(clientX, clientY);

    for (const elemento of elementos) {
      if (!(elemento instanceof HTMLElement)) continue;

      const alvo = elemento.closest<HTMLElement>("[data-categoria-ordem-id]");
      const categoriaId = alvo?.dataset.categoriaOrdemId;

      if (categoriaId) return categoriaId;
    }

    return null;
  }

  function iniciarArrasteCategoria(
    event: PointerEvent<HTMLButtonElement>,
    categoriaId: string
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setCategoriaArrastandoId(categoriaId);
    setCategoriaDestinoId(null);
  }

  function atualizarArrasteCategoria(event: PointerEvent<HTMLButtonElement>) {
    if (!categoriaArrastandoId) return;

    const categoriaId = categoriaNoPonto(event.clientX, event.clientY);
    setCategoriaDestinoId(
      categoriaId && categoriaId !== categoriaArrastandoId ? categoriaId : null
    );
  }

  function finalizarArrasteCategoria(event: PointerEvent<HTMLButtonElement>) {
    if (!categoriaArrastandoId) return;

    const categoriaId =
      categoriaDestinoId ?? categoriaNoPonto(event.clientX, event.clientY);

    if (categoriaId && categoriaId !== categoriaArrastandoId) {
      moverCategoriaPara(categoriaArrastandoId, categoriaId);
    }

    setCategoriaArrastandoId(null);
    setCategoriaDestinoId(null);
  }

  function salvarCategoria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pizzaria || !nomeCategoria.trim()) return;

    const nomeFinal = nomeCategoria.trim();
    const jaExiste = categorias.some(
      (categoria) => normalizarTexto(categoria.nome) === normalizarTexto(nomeFinal)
    );

    if (jaExiste) {
      mostrarErro("Ja existe uma categoria com esse nome.");
      return;
    }

    setSalvandoCategoria(true);

    const proximaOrdem =
      categorias.reduce(
        (maiorOrdem, categoria) => Math.max(maiorOrdem, categoria.ordem ?? 0),
        0
      ) + 1;
    const proximasCategorias = ordenarCategorias([
      ...categorias,
      {
        id: `local-${crypto.randomUUID()}`,
        nome: nomeFinal,
        ordem: proximaOrdem,
      },
    ]);

    salvarCategoriasOrdenadas(proximasCategorias);
    setSalvandoCategoria(false);
    fecharModalCategoria();
  }

  function abrirNovoProduto() {
    if (filtroCardapio === "bordas") {
      abrirNovaBorda();
      return;
    }

    const categoriaInicialId = filtroCardapio === "todos" ? "" : filtroCardapio;
    const categoriaInicialNome =
      categorias.find((categoria) => categoria.id === categoriaInicialId)?.nome ?? "";

    setProdutoEditando(null);
    setCategoriaId(categoriaInicialId);
    setNome("");
    setDescricao("");
    setFotoUrl("");
    setFotoArquivo(null);
    setFotoPreview("");
    setOpcoes(opcoesIniciais(categoriaInicialNome));
    setComboProdutoIds([]);
    setComboProdutoOpcoes({});
    setComboCategoriaAberta(null);
    setComboDescontoTipo("percentual");
    setComboDescontoValor("");
    setModalAberto(true);
  }

  function abrirEdicaoProduto(produto: Produto) {
    const nomeCategoria = produto.categoria_id
      ? categorias.find((categoria) => categoria.id === produto.categoria_id)?.nome ?? ""
      : "";

    setProdutoEditando(produto);
    setCategoriaId(produto.categoria_id ?? "");
    setNome(produto.nome);
    setDescricao(produto.descricao ?? "");
    setFotoUrl(produto.imagem_url ?? "");
    setFotoArquivo(null);
    setFotoPreview(produto.imagem_url ?? "");
    setComboProdutoIds(produto.comboProdutoIds ?? []);
    setComboProdutoOpcoes(produto.comboProdutoOpcoes ?? {});
    setComboCategoriaAberta(null);
    setComboDescontoTipo(produto.comboDescontoTipo ?? "percentual");
    setComboDescontoValor(
      produto.comboDescontoValor ? String(produto.comboDescontoValor).replace(".", ",") : ""
    );

    setOpcoes(
      categoriaEhAdicional(nomeCategoria) && produto.opcoes.length > 0
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
          : opcoesIniciais(nomeCategoria)
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

    const ehAdicional = categoriaSelecionadaEhAdicional;
    const ehCombo = categoriaSelecionadaEhCombo;
    const tipoTecnico = inferirTipoTecnico(categoriaSelecionadaNome);
    const opcoesParaSalvar = ehCombo
      ? [{ nome: "Combo", preco: String(comboPrecoCalculado).replace(".", ",") }]
      : ehAdicional
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

    if (!categoriaId) {
      mostrarErro("Escolha uma categoria para o produto.");
      return;
    }

    if (!nome.trim() || opcoesValidas.length === 0) {
      mostrarErro("Informe o nome do produto e pelo menos uma opcao com preco.");
      return;
    }

    if (ehCombo && comboProdutoIds.length === 0) {
      mostrarErro("Selecione pelo menos um produto para montar o combo.");
      return;
    }

    if (ehCombo && comboPrecoCalculado <= 0) {
      mostrarErro("Selecione produtos com preco para montar o combo.");
      return;
    }

    setSalvando(true);
    setErroProdutos("");

    let imagemUrl = produtoEditando?.imagem_url ?? (fotoUrl.trim() || null);

    if (!ehAdicional && fotoArquivo) {
      try {
        imagemUrl = await arquivoParaDataUrl(fotoArquivo);
      } catch {
        mostrarErro("Nao foi possivel carregar a foto.");
        setSalvando(false);
        return;
      }
    }

    const produtoId = produtoEditando?.id ?? `local-${crypto.randomUUID()}`;
    const opcoesProduto = opcoesValidas.map((opcao, index) => ({
      id: `${produtoId}-opcao-${index + 1}` ,
      produto_id: produtoId,
      nome: opcao.nome,
      preco: opcao.preco,
    }));
    const precos = opcoesProduto.map((opcao) => opcao.preco);
    const produtoFinal: Produto = {
      id: produtoId,
      categoria_id: categoriaId,
      categoria: categoriaSelecionadaNome,
      nome: nome.trim(),
      descricao: ehAdicional ? null : descricao.trim() || null,
      tipo: tipoTecnico,
      ativo: true,
      imagem_url: ehAdicional ? null : imagemUrl,
      precoInicial: precos.length > 0 ? Math.min(...precos) : null,
      opcoes: opcoesProduto,
      comboProdutoIds: ehCombo ? comboProdutoIds : undefined,
      comboProdutoOpcoes: ehCombo ? comboProdutoOpcoes : undefined,
      comboDescontoTipo: ehCombo ? comboDescontoTipo : undefined,
      comboDescontoValor:
        ehCombo && Number.isFinite(comboDescontoNumero) && comboDescontoNumero > 0
          ? comboDescontoNumero
          : null,
      comboPrecoOriginal: ehCombo ? comboSubtotal : null,
    };

    const proximosProdutos = produtoEditando
      ? produtos.map((produto) =>
          produto.id === produtoEditando.id ? produtoFinal : produto
        )
      : [...produtos, produtoFinal];

    setProdutos(proximosProdutos);
    salvarProdutosLocais(pizzaria.id, proximosProdutos);
    setSalvando(false);
    fecharModal();
  }

  function confirmarExclusaoProduto() {
    if (!pizzaria || !produtoParaExcluir) return;

    setExcluindo(true);
    const proximosProdutos = produtos.filter(
      (produto) => produto.id !== produtoParaExcluir.id
    );
    setProdutos(proximosProdutos);
    salvarProdutosLocais(pizzaria.id, proximosProdutos);
    setProdutoParaExcluir(null);
    setExcluindo(false);
  }

  function salvarBorda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pizzaria || !nomeBorda.trim()) return;

    const precoFinal = precoNumero(precoBorda || "0");

    if (!Number.isFinite(precoFinal) || precoFinal < 0) {
      mostrarErro("Informe um preco valido para a borda.");
      return;
    }

    setSalvandoBorda(true);
    setErroProdutos("");

    const bordaFinal: Borda = {
      id: bordaEditando?.id ?? `local-${crypto.randomUUID()}`,
      nome: nomeBorda.trim(),
      preco: precoFinal,
      ordem:
        bordaEditando?.ordem ??
        bordas.reduce((maiorOrdem, borda) => Math.max(maiorOrdem, borda.ordem ?? 0), 0) + 1,
    };

    const proximasBordas = bordaEditando
      ? bordas.map((borda) => (borda.id === bordaEditando.id ? bordaFinal : borda))
      : [...bordas, bordaFinal];

    setBordas(proximasBordas);
    salvarBordasLocais(pizzaria.id, proximasBordas);
    setSalvandoBorda(false);
    fecharModalBorda();
  }

  function confirmarExclusaoBorda() {
    if (!pizzaria || !bordaParaExcluir) return;

    setExcluindoBorda(true);
    const proximasBordas = bordas.filter((borda) => borda.id !== bordaParaExcluir.id);
    setBordas(proximasBordas);
    salvarBordasLocais(pizzaria.id, proximasBordas);
    setBordaParaExcluir(null);
    setExcluindoBorda(false);
  }

  function renderTabelaProdutos(titulo: string, listaProdutos: Produto[]) {
    return (
      <section
        key={titulo || "produtos"}
        className="overflow-hidden rounded-[28px] border border-[#f0d6bf] bg-[#fff7ed] shadow-[0_18px_45px_rgba(31,18,13,0.08)]"
      >
        {titulo && (
          <div className="border-b border-[#f0d6bf] bg-[#fff1df] px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[#9d4d20]">
              {titulo}
            </h2>
          </div>
        )}

        <div className="hidden grid-cols-[1.3fr_0.8fr_0.8fr_170px] gap-4 border-b border-[#f0d6bf] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#9b7a61] md:grid">
          <span>Produto</span>
          <span>Categoria</span>
          <span className="text-right">Preco inicial</span>
          <span className="text-right">Acoes</span>
        </div>

        {listaProdutos.map((produto) => (
          <article
            key={produto.id}
            className="grid grid-cols-1 gap-4 border-b border-[#f0d6bf] px-5 py-4 last:border-b-0 md:grid-cols-[1.3fr_0.8fr_0.8fr_170px] md:items-center"
          >
            <div>
              <h3 className="text-base font-black text-[#1f120d]">{produto.nome}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#7a5942]">
                {produto.descricao ?? "Sem descricao cadastrada"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:contents">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9b7a61] md:hidden">
                  Categoria
                </p>
                <p className="mt-1 text-sm font-bold text-[#5d4030] md:mt-0">
                  {produto.categoria}
                </p>
              </div>

              <div className="col-span-2 md:col-span-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9b7a61] md:hidden">
                  Preco inicial
                </p>
                <p className="mt-1 text-left text-lg font-black text-[#1f120d] md:mt-0 md:text-right">
                  {produto.precoInicial === null
                    ? "Sem preco"
                    : dinheiro(produto.precoInicial)}
                </p>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-2 md:col-span-1 md:flex md:justify-end">
                <button
                  type="button"
                  onClick={() => abrirEdicaoProduto(produto)}
                  className="rounded-2xl border border-[#ead3ba] bg-white px-4 py-3 text-sm font-black text-[#1f120d] shadow-sm"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => setProdutoParaExcluir(produto)}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
                >
                  Excluir
                </button>
              </div>
            </div>
          </article>
        ))}

        {!carregandoProdutos && listaProdutos.length === 0 && (
          <div className="p-5 text-sm font-bold text-[#7a5942]">
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
      <section className="rounded-[32px] border border-[#f0d6bf] bg-[#fff7ed] p-6 text-[#1f120d] shadow-[0_18px_45px_rgba(31,18,13,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#9d4d20]">
              Produtos
            </p>

            <h1 className="mt-3 text-3xl font-black text-[#1f120d]">Cardapio</h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7a5942]">
              Cadastre pizzas, bebidas, sobremesas, combos e adicionais da operacao.
            </p>
          </div>

          <div className="grid gap-2 sm:flex">
            {filtroCardapio !== "bordas" && (
              <>
                <button
                  type="button"
                  onClick={() => setModalOrganizarCategoriasAberto(true)}
                  className="rounded-2xl border border-[#ead3ba] bg-white px-5 py-3 text-sm font-black text-[#1f120d] shadow-sm transition hover:bg-[#fff1df]"
                >
                  Organizar categorias
                </button>

                <button
                  type="button"
                  onClick={abrirNovaCategoria}
                  className="rounded-2xl border border-[#ead3ba] bg-white px-5 py-3 text-sm font-black text-[#1f120d] shadow-sm transition hover:bg-[#fff1df]"
                >
                  + Adicionar categoria
                </button>
              </>
            )}

            <button
              type="button"
              onClick={abrirNovoProduto}
              className="rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff6a26]"
            >
              {filtroCardapio === "bordas" ? "+ Adicionar borda" : "+ Adicionar produto"}
            </button>
          </div>
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
              ...categoriasOrdenadas.map((categoria) => ({
                label: categoria.nome,
                value: categoria.id,
              })),
              { label: "Bordas", value: "bordas" as const },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFiltroCardapio(item.value)}
                className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-black transition ${
                  filtroCardapio === item.value
                    ? "bg-[#ff7a3d] text-white shadow-sm"
                    : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </section>

          {filtroCardapio === "bordas" ? (
            <section className="overflow-hidden rounded-[28px] border border-[#f0d6bf] bg-[#fff7ed] shadow-[0_18px_45px_rgba(31,18,13,0.08)]">
              <div className="hidden grid-cols-[1fr_0.8fr_170px] gap-4 border-b border-[#f0d6bf] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#9b7a61] md:grid">
                <span>Borda</span>
                <span className="text-right">Preco</span>
                <span className="text-right">Acoes</span>
              </div>

              {bordas.map((borda) => (
                <article
                  key={borda.id}
                  className="grid grid-cols-1 gap-4 border-b border-[#f0d6bf] px-5 py-4 last:border-b-0 md:grid-cols-[1fr_0.8fr_170px] md:items-center"
                >
                  <div>
                    <h2 className="text-base font-black text-[#1f120d]">
                      {borda.nome}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#7a5942]">
                      Ordem {borda.ordem ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9b7a61] md:hidden">
                      Preco
                    </p>
                    <p className="mt-1 text-left text-lg font-black text-[#1f120d] md:mt-0 md:text-right">
                      {dinheiro(borda.preco)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
                    <button
                      type="button"
                      onClick={() => abrirEdicaoBorda(borda)}
                      className="rounded-2xl border border-[#ead3ba] bg-white px-4 py-3 text-sm font-black text-[#1f120d] shadow-sm"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => setBordaParaExcluir(borda)}
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}

              {!carregandoProdutos && bordas.length === 0 && (
                <div className="p-5 text-sm font-bold text-[#7a5942]">
                  Nenhuma borda cadastrada.
                </div>
              )}
            </section>
          ) : filtroCardapio === "todos" ? (
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
                    ? "Editar item do cardapio"
                    : "Adicionar ao cardapio"}
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
                  Categoria
                </span>
                <select
                  value={categoriaId}
                  onChange={(event) => {
                    const proximaCategoriaId = event.target.value;
                    const proximaCategoriaNome =
                      categorias.find((categoria) => categoria.id === proximaCategoriaId)
                        ?.nome ?? "";

                    setCategoriaId(proximaCategoriaId);
                    setOpcoes(opcoesIniciais(proximaCategoriaNome));

                    if (!categoriaEhCombo(proximaCategoriaNome)) {
                      setComboProdutoIds([]);
                    }
                  }}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                  required
                >
                  <option value="">Escolha uma categoria</option>
                  {categoriasOrdenadas.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">
                  Nome do produto
                </span>
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
              </label>

              {!categoriaSelecionadaEhAdicional && (
                <>
                  <label>
                    <span className="mb-2 block text-sm font-black text-zinc-200">
                      Descricao
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

                    <div className="grid gap-2 rounded-2xl border border-white/10 bg-[#0f0c0b] p-2 sm:grid-cols-[120px_1fr] sm:gap-3 sm:rounded-3xl sm:p-3">
                      <div className="grid h-24 place-items-center overflow-hidden rounded-2xl bg-white/[0.04] sm:h-auto sm:aspect-[1.2]">
                        {fotoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={fotoPreview}
                            alt="Previa da foto"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="px-4 text-center text-xs font-bold leading-5 text-zinc-500">
                            Sem foto
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col justify-center gap-2">
                        <label className="grid h-10 cursor-pointer place-items-center rounded-2xl bg-[#ff7a3d] px-4 text-xs font-black text-white transition hover:bg-[#ff6a26] sm:h-12 sm:text-sm">
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
                            className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-zinc-200 sm:h-12 sm:text-sm"
                          >
                            Remover foto
                          </button>
                        )}

                        <span className="hidden text-xs font-bold leading-5 text-zinc-500 sm:block">
                          Use uma imagem quadrada ou horizontal. No celular, este
                          botao abre a galeria.
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {categoriaSelecionadaEhCombo && (
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
                  {gruposProdutosParaCombo.map((grupo) => {
                    const aberto = comboCategoriaAberta === grupo.categoria;

                    return (
                      <div key={grupo.categoria} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f0c0b]">
                        <button
                          type="button"
                          onClick={() =>
                            setComboCategoriaAberta((atual) =>
                              atual === grupo.categoria ? null : grupo.categoria
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <span>
                            <span className="block text-sm font-black text-white">
                              {grupo.categoria}
                            </span>
                            <span className="mt-1 block text-xs font-bold text-zinc-500">
                              {grupo.produtos.length} produtos
                            </span>
                          </span>
                          <span className="text-sm font-black text-[#ffb26a]">
                            {aberto ? "Fechar" : "Abrir"}
                          </span>
                        </button>

                        {aberto && (
                          <div className="grid gap-2 border-t border-white/10 p-3">
                            {grupo.produtos.map((produto) => {
                              const selecionado = comboProdutoIds.includes(produto.id);
                              const opcaoSelecionadaId =
                                comboProdutoOpcoes[produto.id] ?? produto.opcoes[0]?.id ?? "";

                              return (
                                <div
                                  key={produto.id}
                                  className={`rounded-2xl border px-4 py-3 transition ${
                                    selecionado
                                      ? "border-[#ff7a3d] bg-[#ff7a3d]/15"
                                      : "border-white/10 bg-white/[0.03]"
                                  }`}
                                >
                                  <label className="flex cursor-pointer items-center justify-between gap-3">
                                    <span>
                                      <span className="block text-sm font-black text-white">
                                        {produto.nome}
                                      </span>
                                      <span className="mt-1 block text-xs font-bold text-zinc-500">
                                        A partir de {produto.precoInicial === null ? "sem preco" : dinheiro(produto.precoInicial)}
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

                                        if (event.target.checked && produto.opcoes[0]?.id) {
                                          setComboProdutoOpcoes((atuais) => ({
                                            ...atuais,
                                            [produto.id]: produto.opcoes[0].id ?? "",
                                          }));
                                        } else if (!event.target.checked) {
                                          setComboProdutoOpcoes((atuais) => {
                                            const proximasOpcoes = { ...atuais };
                                            delete proximasOpcoes[produto.id];
                                            return proximasOpcoes;
                                          });
                                        }
                                      }}
                                      className="h-5 w-5 accent-[#ff7a3d]"
                                    />
                                  </label>

                                  {selecionado && produto.opcoes.length > 1 && categoriaEhPizza(produto.categoria) && (
                                    <label className="mt-3 block">
                                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                                        Tamanho
                                      </span>
                                      <select
                                        value={opcaoSelecionadaId}
                                        onChange={(event) =>
                                          setComboProdutoOpcoes((atuais) => ({
                                            ...atuais,
                                            [produto.id]: event.target.value,
                                          }))
                                        }
                                        className="h-11 w-full rounded-2xl border border-white/10 bg-[#140f0d] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                                      >
                                        {produto.opcoes.map((opcao) => (
                                          <option key={opcao.id} value={opcao.id}>
                                            {opcao.nome} - {dinheiro(Number(opcao.preco))}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {produtosParaCombo.length === 0 && (
                    <p className="rounded-2xl border border-white/10 bg-[#0f0c0b] p-4 text-sm font-bold text-zinc-400">
                      Cadastre pizzas, bebidas ou sobremesas antes de montar um
                      combo.
                    </p>
                  )}
                </div>

                <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-[#0f0c0b] p-4 sm:grid-cols-[1fr_1fr]">
                  <div className="sm:col-span-2">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                      Soma dos produtos
                    </p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {dinheiro(comboSubtotal)}
                    </p>
                  </div>

                  <label>
                    <span className="mb-2 block text-sm font-black text-zinc-200">
                      Tipo de desconto
                    </span>
                    <select
                      value={comboDescontoTipo}
                      onChange={(event) =>
                        setComboDescontoTipo(event.target.value as "percentual" | "valor")
                      }
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#140f0d] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                    >
                      <option value="percentual">Porcentagem (%)</option>
                      <option value="valor">Valor direto (R$)</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-zinc-200">
                      Desconto
                    </span>
                    <input
                      value={comboDescontoValor}
                      onChange={(event) => setComboDescontoValor(event.target.value)}
                      placeholder={comboDescontoTipo === "percentual" ? "10" : "5,00"}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#140f0d] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                    />
                  </label>

                  <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-black text-white sm:col-span-2">
                    Preco do combo: {dinheiro(comboPrecoCalculado)}
                  </p>
                </div>
              </div>
            )}

            {!categoriaSelecionadaEhCombo && (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-zinc-200">
                  {categoriaSelecionadaEhAdicional
                    ? "Preco do adicional"
                    : categoriaSelecionadaEhCombo
                      ? "Preco do combo"
                      : "Tamanhos, variacoes e precos"}
                </h3>

                {!categoriaSelecionadaEhCombo && !categoriaSelecionadaEhAdicional && (
                  <button
                    type="button"
                    onClick={adicionarOpcao}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-200"
                  >
                    + Opcao
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {opcoes.map((opcao, index) => (
                  <div
                    key={index}
                    className={`grid gap-2 ${
                      categoriaSelecionadaEhAdicional ? "" : "sm:grid-cols-[1fr_120px_auto]"
                    }`}
                  >
                    {!categoriaSelecionadaEhAdicional && (
                      <input
                        value={opcao.nome}
                        onChange={(event) =>
                          alterarOpcao(index, "nome", event.target.value)
                        }
                        placeholder="Especificacoes"
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

                    {!categoriaSelecionadaEhAdicional && (
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
            )}

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
                  Preco
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

      {modalCategoriaAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <form
            ref={modalCategoriaRef}
            onSubmit={salvarCategoria}
            className="w-full rounded-t-[32px] border border-white/10 bg-[#140f0d] p-5 shadow-2xl sm:max-w-lg sm:rounded-[32px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
                  Nova categoria
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Adicionar categoria
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModalCategoria}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-200"
              >
                Fechar
              </button>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-black text-zinc-200">
                Nome
              </span>
              <input
                value={nomeCategoria}
                onChange={(event) => setNomeCategoria(event.target.value)}
                placeholder="Ex: Pizzas tradicionais"
                required
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
              />
            </label>

            <button
              type="submit"
              disabled={salvandoCategoria}
              className="mt-6 w-full rounded-2xl bg-[#ff7a3d] px-5 py-4 text-sm font-black text-white transition hover:bg-[#ff6a26] disabled:opacity-60"
            >
              {salvandoCategoria ? "Salvando..." : "Salvar categoria"}
            </button>
          </form>
        </div>
      )}

      {modalOrganizarCategoriasAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <div
            ref={modalOrganizarCategoriasRef}
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-[32px] border border-white/10 bg-[#140f0d] p-5 shadow-2xl sm:max-w-lg sm:rounded-[32px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
                  Categorias
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Organizar ordem
                </h2>
                <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">
                  A ordem daqui e a mesma ordem dos filtros no cardapio do cliente.
                </p>
                <p className="mt-1 text-xs font-bold text-zinc-500">
                  Arraste pela alca ou use as setas.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalOrganizarCategorias}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-200"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {categoriasOrdenadas.map((categoria, index) => (
                <article
                  key={categoria.id}
                  data-categoria-ordem-id={categoria.id}
                  className={`rounded-2xl border p-3 transition ${
                    categoriaDestinoId === categoria.id
                      ? "border-[#ff7a3d] bg-[#20130d]"
                      : categoriaArrastandoId === categoria.id
                        ? "border-[#ffb26a]/70 bg-[#1b100c] opacity-80"
                        : "border-white/10 bg-[#0f0c0b]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Arrastar ${categoria.nome}`}
                      onPointerDown={(event) => iniciarArrasteCategoria(event, categoria.id)}
                      onPointerMove={atualizarArrasteCategoria}
                      onPointerUp={finalizarArrasteCategoria}
                      onPointerCancel={() => {
                        setCategoriaArrastandoId(null);
                        setCategoriaDestinoId(null);
                      }}
                      className="grid h-11 w-11 shrink-0 touch-none cursor-grab place-items-center rounded-2xl bg-white/[0.06] text-lg font-black leading-none text-[#ffb26a] active:cursor-grabbing"
                    >
                      =
                    </button>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black text-white">
                        {categoria.nome}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-zinc-500">
                        Posicao {index + 1}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        aria-label={`Subir ${categoria.nome}`}
                        onClick={() => moverCategoria(categoria.id, -1)}
                        disabled={index === 0}
                        className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-black text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ^
                      </button>

                      <button
                        type="button"
                        aria-label={`Descer ${categoria.nome}`}
                        onClick={() => moverCategoria(categoria.id, 1)}
                        disabled={index === categoriasOrdenadas.length - 1}
                        className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-black text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        v
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {categoriasOrdenadas.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-zinc-300">
                  Nenhuma categoria cadastrada ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        aberto={Boolean(produtoParaExcluir)}
        titulo="Excluir produto?"
        descricao={`O produto "${
          produtoParaExcluir?.nome ?? ""
        }" saira do cardapio, mas o historico permanece preservado.`}
        confirmando={excluindo}
        onCancelar={() => setProdutoParaExcluir(null)}
        onConfirmar={confirmarExclusaoProduto}
      />

      <ConfirmDialog
        aberto={Boolean(bordaParaExcluir)}
        titulo="Excluir borda?"
        descricao={`A borda "${
          bordaParaExcluir?.nome ?? ""
        }" deixara de aparecer para novas pizzas.`}
        confirmando={excluindoBorda}
        onCancelar={() => setBordaParaExcluir(null)}
        onConfirmar={confirmarExclusaoBorda}
      />

      <FeedbackDialog
        aberto={Boolean(erroModal)}
        titulo="Nao foi possivel salvar"
        descricao={erroModal}
        onFechar={() => setErroModal("")}
      />
    </div>
  );
}
