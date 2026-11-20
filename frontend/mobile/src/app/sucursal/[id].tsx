import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { CaretDownIcon, CaretUpIcon, MapPinIcon, PhoneIcon } from 'phosphor-react-native';
import Screen, { BackButton } from '../../components/Screen';
import Txt from '../../components/Txt';
import Button from '../../components/Button';
import { ErrorScreen, OfflineState, PhotoPlaceholder, Skeleton } from '../../components/States';
import { RatingLine, Stars } from '../../components/Branch';
import useConnectivity from '../../hooks/useConnectivity';
import { activeServices, bookableStaff, cheapestService, getBranch, isVisible, openStatus, weekSchedule } from '../../data/catalog';
import { productsFor } from '../../data/shop';
import { minutes, money } from '../../theme/format';
import { color, font, radius, space, touch } from '../../theme/tokens';
import CartButton from '../../components/CartButton';

const STAFF_PHOTO = 132;

// Branch profile: full-width gallery, name, today's hours, services as a
// typographic list, professionals, recent reviews and a pinned "Reservar".
// States: ?estado=cargando | error | sin-resenas | sin-conexion
// navaja-fina has no reviews, no photos and no staff profiles yet.
export default function BranchProfile() {
  const { id, estado } = useLocalSearchParams<{ id?: string; estado?: string }>();
  const { online, failure, retry, retrying } = useConnectivity(estado === 'error' ? 'error-servidor' : estado);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [showWeek, setShowWeek] = useState(false);

  const found = getBranch(id);
  // Hidden branches (deactivated, suspended or unpaid business) are not shown (RN-13, RN-14).
  const branch = found && isVisible(found) ? { ...found, services: activeServices(found), staff: bookableStaff(found) } : null;

  if (!online) return <OfflineState kind={failure} onRetry={retry} retrying={retrying} />;
  if (estado === 'cargando') return <BranchSkeleton />;
  // Hidden or removed branch (RF-M18): "Ya no está disponible".
  if (!branch) {
    return <ErrorScreen kind="no-existe" detail="Este negocio ya no aparece en SNIPP. Puede que haya cerrado o que su suscripción esté pendiente; las citas que ya tenías siguen en pie." onRetry={retry} retrying={retrying} />;
  }

  const frameWidth = Math.min(width, 390);
  const status = openStatus(branch);
  const reviews = estado === 'sin-resenas' ? [] : branch.reviews;
  const cheapest = cheapestService(branch);
  const photos = branch.gallery.length ? branch.gallery : null;

  return (
    <Screen
      padded={false}
      footer={
        branch.staff.length ? (
          <View style={styles.footer}>
            <View style={{ flex: 1 }}>
              <Txt variant="small">{branch.services.length} servicios</Txt>
              <Txt variant="heading" numeric>desde {money(cheapest.price)}</Txt>
            </View>
            <Button
              label="Reservar"
              onPress={() => router.push({ pathname: '/reservar', params: { sucursal: branch.id } })}
              style={{ minWidth: 160 }}
            />
          </View>
        ) : (
          // RF-M06 requires choosing a professional; without one there is nothing to book.
          <Txt variant="body" style={{ paddingVertical: space.s }}>Todavía no se puede reservar aquí: la sucursal no tiene profesionales registrados.</Txt>
        )
      }
    >
      <View style={[styles.padded, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <BackButton />
        <CartButton branchId={branch.id} />
      </View>

      {/* Gallery, full width */}
      {photos ? (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / frameWidth))}
            onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / frameWidth))}
            scrollEventThrottle={64}
          >
            {photos.map((p) => (
              <Image key={p.alt} source={p.source} style={{ width: frameWidth, height: Math.round(frameWidth * 0.68) }} contentFit="cover" accessibilityLabel={p.alt} />
            ))}
          </ScrollView>
          {photos.length > 1 ? (
            <Txt variant="small" numeric style={styles.pageCount}>Foto {page + 1} de {photos.length}, desliza para ver más</Txt>
          ) : null}
        </View>
      ) : (
        <View style={styles.padded}>
          <PhotoPlaceholder filename={branch.galleryFiles?.join(', ')} style={{ height: Math.round(frameWidth * 0.55) }} />
        </View>
      )}

      <View style={[styles.padded, { marginTop: space.xl }]}>
        <Txt variant="display" accessibilityRole="header">{branch.name}</Txt>
        <Txt variant="bodySoft" style={{ marginTop: space.xs }}>{branch.kind} en {branch.neighborhood}</Txt>
        <View style={{ marginTop: space.s }}>
          <RatingLine branch={{ ...branch, reviewCount: reviews.length ? branch.reviewCount : 0 }} variant="label" />
        </View>

        {/* Today's hours, highlighted; week on demand */}
        <View style={styles.hours}>
          <Txt variant="label" style={{ color: status.open ? color.ink : color.inkSoft, fontFamily: font.bodySemi }}>{status.label}</Txt>
          <Pressable
            onPress={() => setShowWeek((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showWeek }}
            style={styles.weekToggle}
          >
            <Txt variant="small" style={{ color: color.ink, textDecorationLine: 'underline' }}>Horario de la semana</Txt>
            {showWeek ? <CaretUpIcon size={16} color={color.ink} /> : <CaretDownIcon size={16} color={color.ink} />}
          </Pressable>
        </View>
        {showWeek ? (
          <View style={styles.week}>
            {weekSchedule(branch).map((d) => (
              <View key={d.day} style={styles.weekRow}>
                <Txt variant={d.today ? 'label' : 'body'} style={styles.cap}>{d.day}{d.today ? ' (hoy)' : ''}</Txt>
                <Txt variant={d.today ? 'label' : 'body'} numeric style={!d.today && d.label === 'Cerrado' ? { color: color.inkSoft } : null}>{d.label}</Txt>
              </View>
            ))}
          </View>
        ) : null}

        <Txt variant="body" style={{ marginTop: space.xl }}>{branch.description}</Txt>

        <View style={styles.contact}>
          <View style={styles.contactRow}>
            <MapPinIcon size={22} color={color.ink} />
            <Txt variant="body" style={{ flex: 1 }}>{branch.address}, {branch.neighborhood}</Txt>
          </View>
          <View style={styles.contactRow}>
            <PhoneIcon size={22} color={color.ink} />
            <Txt variant="body" numeric>{branch.phone}</Txt>
          </View>
        </View>

        {/* Services: name and duration left, tabular price right. No dividers. */}
        <Txt variant="title" accessibilityRole="header" style={styles.section}>
          {branch.services.length} servicios
        </Txt>
        <View style={{ marginTop: space.m, gap: space.l }}>
          {branch.services.map((s) => (
            <View key={s.id} style={styles.serviceRow} accessible accessibilityLabel={`${s.name}, ${minutes(s.minutes)}, ${money(s.price)}`}>
              <View style={{ flex: 1 }}>
                <Txt variant="body" style={{ fontFamily: font.bodyMedium }}>{s.name}</Txt>
                <Txt variant="small" numeric>{minutes(s.minutes)}</Txt>
              </View>
              <Txt variant="body" numeric style={{ fontFamily: font.bodyMedium }}>{money(s.price)}</Txt>
            </View>
          ))}
        </View>
        <Txt variant="small" style={{ marginTop: space.l }}>Las citas se pagan en la sucursal.</Txt>
      </View>

      {/* Store */}
      {productsFor(branch.id).length ? (
        <View style={[styles.padded, styles.section]}>
          <Txt variant="title" accessibilityRole="header">Productos para recoger aquí</Txt>
          <Txt variant="bodySoft" style={{ marginTop: space.xs }}>
            {productsFor(branch.id).map((p) => p.name).join(', ')}. Se pagan en la app y se recogen en mostrador.
          </Txt>
          <Button
            variant="secondary"
            label={`Ver los ${productsFor(branch.id).length} productos`}
            onPress={() => router.push(`/tienda/${branch.id}`)}
            style={{ marginTop: space.l }}
          />
        </View>
      ) : null}

      {/* Professionals */}
      <View style={[styles.padded, styles.section]}>
        <Txt variant="title" accessibilityRole="header">
          {branch.staff.length ? `Te ${branch.staff.length === 1 ? 'atiende' : 'pueden atender'}` : 'Profesionales'}
        </Txt>
      </View>
      {branch.staff.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffList}>
          {branch.staff.map((e) => {
            const file = `${e.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')}.jpg`;
            return (
              <View key={e.id} style={{ width: STAFF_PHOTO }}>
                <PhotoPlaceholder filename={file} style={{ width: STAFF_PHOTO, height: STAFF_PHOTO * 1.2, padding: space.s }} />
                <Txt variant="label" style={{ marginTop: space.s }}>{e.name}</Txt>
                <Txt variant="small">{e.specialty}</Txt>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Txt variant="bodySoft" style={[styles.padded, { marginTop: space.s }]}>
          Los profesionales de {branch.name} todavía no suben su perfil. Cuando se registren, podrás reservar con ellos.
        </Txt>
      )}

      {/* Reviews */}
      <View style={[styles.padded, styles.section]}>
        {reviews.length ? (
          <>
            <Txt variant="title" accessibilityRole="header">Lo que dicen de {branch.name.replace('Barbería ', '')}</Txt>
            <Txt variant="small" numeric style={{ marginTop: space.xs }}>
              {reviews.length} reseñas recientes de {branch.reviewCount}. Solo opinan clientes que ya se atendieron aquí.
            </Txt>
            <View style={{ marginTop: space.xl, gap: space.xxl }}>
              {reviews.map((r) => (
                <View key={r.id} style={{ gap: space.xs }}>
                  <View style={styles.reviewHead}>
                    <Stars value={r.stars} />
                    <Txt variant="small" numeric>{r.date}</Txt>
                  </View>
                  <Txt variant="body">{r.text}</Txt>
                  <Txt variant="small">{r.author}, {r.service.charAt(0).toLowerCase() + r.service.slice(1)}</Txt>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Txt variant="title" accessibilityRole="header">{branch.name} todavía no tiene reseñas</Txt>
            <Txt variant="bodySoft" style={{ marginTop: space.s }}>
              Las reseñas solo las dejan clientes después de una cita atendida. Si reservas aquí, podrás escribir la primera.
            </Txt>
          </>
        )}
      </View>
    </Screen>
  );
}

function BranchSkeleton() {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 390);
  return (
    <Screen padded={false}>
      <View style={styles.padded}><BackButton /></View>
      <View accessible accessibilityLabel="Cargando la sucursal">
        <Skeleton width={w} height={Math.round(w * 0.68)} radius={0} />
        <View style={[styles.padded, { marginTop: space.xl, gap: space.s }]}>
          <Skeleton width="75%" height={30} />
          <Skeleton width="45%" height={16} />
          <Skeleton width="40%" height={16} />
          <Skeleton width="55%" height={18} style={{ marginTop: space.l }} />
          <Skeleton height={16} style={{ marginTop: space.xl }} />
          <Skeleton width="90%" height={16} />
          <Skeleton width="30%" height={24} style={{ marginTop: space.xxl }} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.serviceRow, { marginTop: space.m }]}>
              <Skeleton width="50%" height={16} />
              <Skeleton width={50} height={16} />
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: space.xl },
  pageCount: { paddingHorizontal: space.xl, marginTop: space.s },
  hours: { marginTop: space.l, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.s },
  weekToggle: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: touch },
  week: { marginTop: space.s, backgroundColor: color.sunken, borderRadius: radius.control, padding: space.l, gap: space.s },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cap: { textTransform: 'capitalize' },
  contact: { marginTop: space.l },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 40 },
  section: { marginTop: space.xxxl },
  serviceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.l },
  staffList: { paddingHorizontal: space.xl, gap: space.l, marginTop: space.l },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.l },
});
