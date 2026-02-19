import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function kullaniciyiYonlendir(user, router) {
  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const rol = docSnap.data().rol;
    const durum = docSnap.data().durum;

    if (rol === 'admin') {
      router.push('/admin');
    } else if (rol === 'halisaha') {
      if (durum === 'beklemede') {
        router.push('/halisaha/beklemede');
      } else {
        router.push('/halisaha/panel');
      }
    } else {
      router.push('/');
    }
  } else {
    // Firestore'da kayıt yok — Google ile ilk kez giriş yapıyor
    // Otomatik futbolcu olarak kaydet
    await setDoc(doc(db, 'users', user.uid), {
      ad: user.displayName || '',
      email: user.email,
      rol: 'futbolcu',
      olusturulma: new Date(),
    });
    router.push('/');
  }
}