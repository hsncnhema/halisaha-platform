ALTER TABLE futbolcular
DROP CONSTRAINT futbolcular_user_id_fkey,
ADD CONSTRAINT futbolcular_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

ALTER TABLE sahalar
DROP CONSTRAINT sahalar_user_id_fkey,
ADD CONSTRAINT sahalar_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

ALTER TABLE ilanlar
DROP CONSTRAINT ilanlar_user_id_fkey,
ADD CONSTRAINT ilanlar_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;
