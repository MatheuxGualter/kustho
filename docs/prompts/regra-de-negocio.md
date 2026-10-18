# Regra de negócio (dinheiro)

```text
Regra: <ex.: "compra no dia do fechamento vai para a fatura seguinte">.
Fonte: docs/plano.md, seção "Modelo de dados e regras" (<número da regra, se houver>).

1. Escreva SÓ os testes primeiro, em src/domain/<domínio>/__tests__/, cobrindo os casos
   de borda (datas-limite, fevereiro, centavos de resto, valores zero e negativos).
   Pare e me mostre a lista de casos antes de implementar.
2. Depois implemente como função pura, em centavos inteiros e datas ISODate locais.
3. Se a regra aparece num serviço, cubra também na suíte de contrato
   (src/services/__tests__/contracts/) para o fake e o real.
Lembre: este PR precisa de revisão humana por mexer em dinheiro.
```
