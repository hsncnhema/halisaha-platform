import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function kullaniciyiYonlendir(user, router) {
  // Önce futbolcular koleksiyonuna bak
  const futbolcuSnap = await getDoc(doc(db, 'futbolcular', user.uid));
  if (futbolcuSnap.exists()) {
    const data = futbolcuSnap.data();
    if (data.admin === true) {
      router.push('/admin');
      return;
    }
    if (!data.profilTamamlandi) {
      router.push('/profil-tamamla');
      return;
    }
    router.push('/');
    return;
  }

  // Sahalar koleksiyonuna bak
  const sahaSnap = await getDoc(doc(db, 'sahalar', user.uid));
  if (sahaSnap.exists()) {
    const durum = sahaSnap.data().durum;
    if (durum === 'aktif') {
      router.push('/halisaha/panel');
    } else {
      router.push('/halisaha/beklemede');
    }
    return;
  }

  // Hiçbirinde yoksa — Google ile ilk kez giriş yapıyor
  await setDoc(doc(db, 'futbolcular', user.uid), {
    ad: user.displayName || '',
    email: user.email,
    olusturulma: new Date(),
    profilTamamlandi: false,
  });
  router.push('/profil-tamamla');
}