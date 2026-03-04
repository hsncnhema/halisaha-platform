CREATE TABLE arkadasliklar (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gonderen_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  alici_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  durum text DEFAULT 'beklemede'
    CHECK (durum IN ('beklemede','kabul','reddedildi')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(gonderen_id, alici_id)
);

ALTER TABLE arkadasliklar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taraflar görebilir" ON arkadasliklar
  FOR SELECT USING (
    auth.uid() = gonderen_id OR auth.uid() = alici_id
  );

CREATE POLICY "İstek gönderebilir" ON arkadasliklar
  FOR INSERT WITH CHECK (auth.uid() = gonderen_id);

CREATE POLICY "Alıcı güncelleyebilir" ON arkadasliklar
  FOR UPDATE USING (auth.uid() = alici_id);
