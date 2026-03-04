CREATE TABLE mesajlar (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gonderen_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  alici_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  icerik text NOT NULL,
  okundu boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mesajlar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taraflar görebilir" ON mesajlar
  FOR SELECT USING (
    auth.uid() = gonderen_id OR auth.uid() = alici_id
  );

CREATE POLICY "Gonderen yazabilir" ON mesajlar
  FOR INSERT WITH CHECK (auth.uid() = gonderen_id);

CREATE POLICY "Alici okuyabilir" ON mesajlar
  FOR UPDATE USING (auth.uid() = alici_id);
