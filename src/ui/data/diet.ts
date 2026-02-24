export type Protein =
  | 'frango' | 'carne_magra' | 'ovos' | 'atum' | 'peixe' | 'iogurte_grego' | 'whey' | 'cottage' | 'carne_moida'

export type Carb =
  | 'arroz' | 'batata' | 'mandioca' | 'aveia' | 'pao' | 'macarrao' | 'feijao_lentilha' | 'tapioca' | 'frutas'

export type Fat =
  | 'azeite' | 'castanhas' | 'pasta_amendoim' | 'queijo'

export const PROTEINS: { id: Protein; label: string; hint: string }[] = [
  { id:'frango', label:'Frango 150g', hint:'alto custo-benefício' },
  { id:'carne_magra', label:'Carne magra 150g', hint:'ferro, força' },
  { id:'carne_moida', label:'Carne moída magra 150g', hint:'prático' },
  { id:'ovos', label:'Ovos 4 un (ou 3 + 3 claras)', hint:'rápido' },
  { id:'atum', label:'Atum 1 lata', hint:'viagem/pressa' },
  { id:'peixe', label:'Peixe 150g', hint:'leve' },
  { id:'iogurte_grego', label:'Iogurte grego 200g', hint:'proteína fácil' },
  { id:'cottage', label:'Cottage 200g', hint:'proteína fácil' },
  { id:'whey', label:'Whey 30g', hint:'tampão anti-compulsão' }
]

export const CARBS: { id: Carb; label: string; hint: string }[] = [
  { id:'arroz', label:'Arroz 100g cozido', hint:'base' },
  { id:'feijao_lentilha', label:'Feijão/Lentilha 150g', hint:'fibra/saciedade' },
  { id:'batata', label:'Batata 250g', hint:'boa em cutting' },
  { id:'mandioca', label:'Mandioca 200g', hint:'energia' },
  { id:'macarrao', label:'Macarrão 120g cozido', hint:'prático' },
  { id:'aveia', label:'Aveia 80g', hint:'café/viagem' },
  { id:'pao', label:'Pão 2 fatias', hint:'rápido' },
  { id:'tapioca', label:'Tapioca 2 médias', hint:'rápido' },
  { id:'frutas', label:'Frutas (2 porções)', hint:'controle de vontade' }
]

export const FATS: { id: Fat; label: string }[] = [
  { id:'azeite', label:'Azeite 1 colher' },
  { id:'castanhas', label:'Castanhas 15g' },
  { id:'pasta_amendoim', label:'Pasta de amendoim 1 colher' },
  { id:'queijo', label:'Queijo 30g' }
]

export const VEGS = [
  'Salada', 'Brócolis', 'Cenoura', 'Abobrinha', 'Repolho', 'Tomate', 'Pepino', 'Couve'
]
