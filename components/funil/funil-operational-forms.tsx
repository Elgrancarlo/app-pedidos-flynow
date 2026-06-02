"use client";

import { useState } from "react";

import { FunilSelectControl } from "@/components/funil/funil-filters";
import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
};

type FunilOperationalFormsProps = {
  products: SelectOption[];
};

const componentOptions = [
  { value: "us1", label: "US1" },
  { value: "us2", label: "US2" },
  { value: "frontend", label: "Frontend" },
  { value: "checkout", label: "Checkout" },
  { value: "recuperacao", label: "Recuperacao" },
];

const changeTypeOptions = [
  { value: "mudanca_upsell", label: "Mudanca upsell" },
  { value: "criativo", label: "Criativo" },
  { value: "copy", label: "Copy" },
  { value: "preco", label: "Preco" },
  { value: "operacao", label: "Operacao" },
];

const areaOptions = [
  { value: "operacao", label: "Operacao" },
  { value: "performance", label: "Performance" },
  { value: "produto", label: "Produto" },
  { value: "comercial", label: "Comercial" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-[var(--fly-text-muted)]">
      {children}
    </label>
  );
}

function TextField({
  className,
  label,
  placeholder,
  value,
}: {
  className?: string;
  label: string;
  placeholder?: string;
  value?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <FieldLabel>{label}</FieldLabel>
      <input
        defaultValue={value}
        placeholder={placeholder}
        className="h-10 w-full rounded-[10px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 placeholder:text-[var(--fly-text-dim)] hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]"
      />
    </div>
  );
}

function TextAreaField({
  className,
  label,
  minHeight = "min-h-[86px]",
  placeholder,
}: {
  className?: string;
  label: string;
  minHeight?: string;
  placeholder?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        placeholder={placeholder}
        className={cn(
          "w-full resize-y rounded-[10px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 py-2.5 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 placeholder:text-[var(--fly-text-dim)] hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]",
          minHeight
        )}
      />
    </div>
  );
}

function SelectField({
  displayLabel,
  label,
  options,
  value,
  onChange,
}: {
  displayLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  value: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <FunilSelectControl
        displayLabel={displayLabel}
        label={label}
        onChange={onChange}
        options={options}
        value={value}
      />
    </div>
  );
}

function FormPanel({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="flynow-dashboard-enter-item min-w-0 overflow-hidden rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] shadow-[var(--fly-panel-shadow)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-none text-[var(--fly-text)]">
            {title}
          </h2>
        </div>
        <p className="hidden shrink-0 text-xs text-[var(--fly-text-muted)] sm:block">
          {eyebrow}
        </p>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function FunilOperationalForms({ products }: FunilOperationalFormsProps) {
  const productOptions =
    products.length > 1 ? products : [{ value: "all", label: "Todos" }];
  const [component, setComponent] = useState(componentOptions[0].value);
  const [product, setProduct] = useState(productOptions[0]?.value ?? "all");
  const [relatedProduct, setRelatedProduct] = useState(
    productOptions[0]?.value ?? "all"
  );
  const [changeType, setChangeType] = useState(changeTypeOptions[0].value);
  const [area, setArea] = useState(areaOptions[0].value);

  return (
    <div className="grid gap-4">
      <FormPanel eyebrow="Base para impacto e IA" title="Registrar alteracao do funil">
        <form
          className="grid gap-3"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <TextField label="Data" value="02/06/2026" />
            <SelectField
              displayLabel="Comp."
              label="Componente"
              onChange={setComponent}
              options={componentOptions}
              value={component}
            />
            <SelectField
              displayLabel="Produto"
              label="Produto"
              onChange={setProduct}
              options={productOptions}
              value={product}
            />
            <TextField label="Responsavel" placeholder="Ex: Herberth" />
            <SelectField
              displayLabel="Tipo"
              label="Tipo"
              onChange={setChangeType}
              options={changeTypeOptions}
              value={changeType}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <TextAreaField
              label="Descricao da alteracao"
              placeholder="Ex: Novo produto entrou como UP1 no lugar da oferta anterior."
            />
            <TextAreaField
              label="Hipotese"
              placeholder="Ex: A mudanca deve elevar conversao e receita por pedido."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-10 w-full min-w-[156px] cursor-pointer items-center justify-center rounded-[10px] border border-[var(--fly-border-strong)] bg-[var(--fly-text)] px-4 text-sm font-semibold text-[var(--fly-bg)] shadow-[var(--fly-panel-inset)] outline-none transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-[var(--fly-text-soft)] hover:bg-[var(--fly-text-soft)] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--fly-border-strong)] sm:w-auto"
            >
              Salvar alteracao
            </button>
          </div>
        </form>
      </FormPanel>

      <FormPanel
        eyebrow="Contexto para IA e alertas"
        title="Registrar transcricao operacional"
      >
        <form
          className="grid gap-3"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <TextField label="Data e hora" value="02/06/2026, 09:00" />
            <SelectField
              displayLabel="Area"
              label="Area"
              onChange={setArea}
              options={areaOptions}
              value={area}
            />
            <TextField label="Participantes" placeholder="Carlos, Lucas" />
            <TextField label="Enviado por" placeholder="Ex: COO" />
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <TextField
              label="Titulo"
              placeholder="Ex: Call sobre queda de recuperacao no WhatsApp"
            />
            <SelectField
              displayLabel="Produto"
              label="Produtos relacionados"
              onChange={setRelatedProduct}
              options={productOptions}
              value={relatedProduct}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <TextAreaField
              label="Resumo curto"
              placeholder="Resumo executivo da call."
            />
            <TextAreaField label="Tags" placeholder="whatsapp, saque, reembolso" />
          </div>

          <TextAreaField
            label="Transcricao"
            minHeight="min-h-[180px]"
            placeholder="Cole aqui a transcricao completa da reuniao."
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--fly-border)] bg-[var(--fly-control-solid)] px-4 text-sm font-semibold text-[var(--fly-text)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
            >
              Salvar transcricao
            </button>
          </div>
        </form>
      </FormPanel>
    </div>
  );
}
