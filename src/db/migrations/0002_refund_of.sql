ALTER TABLE `transactions` ADD `refund_of_id` text;--> statement-breakpoint
CREATE INDEX `transactions_refund_of_idx` ON `transactions` (`refund_of_id`);--> statement-breakpoint
-- Estornos feitos antes desta coluna: liga cada um à compra do mesmo cartão cuja descrição
-- ele repete ("Estorno <compra>"), a mais recente até a data do estorno.
UPDATE `transactions` SET `refund_of_id` = (
  SELECT p.`id` FROM `transactions` AS p
  WHERE p.`kind` = 'card_purchase'
    AND p.`card_id` = `transactions`.`card_id`
    AND 'Estorno ' || p.`description` = `transactions`.`description`
    AND p.`date` <= `transactions`.`date`
    AND p.`deleted_at` IS NULL
  ORDER BY p.`date` DESC, p.`installment_number` ASC
  LIMIT 1
)
WHERE `kind` = 'adjustment'
  AND `direction` = 'in'
  AND `card_id` IS NOT NULL
  AND `refund_of_id` IS NULL
  AND `description` LIKE 'Estorno %';
