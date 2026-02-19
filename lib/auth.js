import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function kullaniciyiYonlendir(user, router) {
  // Önce futbolcular koleksiyonuna bak
  const futbolcuSnap = await getDoc(doc(db, 'futbolcular', user.uid));
  if (futbolcuSnap.exists()) {
    router.push('/');
    return;
  }

  // Sonra sahalar koleksiyonuna bak
  const sahaSnap = await getDoc(doc(db, 'sahalar', user.uid));
  if (sahaSnap.exists()) {
    const durum = sahaSnap.data().durum;
    if (durum === 'beklemede') {
      router.push('/halisaha/beklemede');
    } else {
      router.push('/halisaha/panel');
    }
    return;
  }

  // Hiçbir koleksiyonda yoksa — Google ile ilk kez giriş yapıyor
  // Otomatik futbolcu olarak kaydet
  await setDoc(doc(db, 'futbolcular', user.uid), {
    ad: user.displayName || '',
    email: user.email,
    olusturulma: new Date(),
    profilTamamlandi: false,
  });
  router.push('/profil-tamamla');
}