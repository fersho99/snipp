import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { OfflineState, Skeleton } from '../components/States';
import { Cover, RatingLine, SearchField } from '../components/Branch';
import useConnectivity from '../hooks/useConnectivity';
import { openStatus, visibleBranches, priceFrom, searchBranches, serviceFromQuery } from '../data/catalog';
import { services } from '../data/demo';
import { minutes, money } from '../theme/format';
import { color, font, space, touch } from '../theme/tokens';
import type { Branch, Service } from '../types/domain';

const THUMB = 104;

// Search results with service filters as a horizontal row of plain text.
// States: ?q=keratina (sin resultados) | ?estado=cargando | sin-conexion
export default function Results() {
  const params = useLocalSearchParams<{ q?: string; servicio?: string; estado?: string }>();
  const { online, failure, retry, retrying } = useConnectivity(params.estado);
  const initialService = serviceFromQuery(params.q);

  const [input, setInput] = useState(params.q ?? '');
  // If the query is a service name, it becomes the filter instead of free text.
  const [query, setQuery] = useState(initialService ? '' : params.q ?? '');
  const [serviceId, setServiceId] = useState(params.servicio ?? initialService?.id ?? null);

  const results = useMemo(
    () => searchBranches(query, serviceId).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [query, serviceId],
  );

  if (!online) return <OfflineState kind={failure} onRetry={retry} retrying={retrying} />;

  const submit = (text: string) => {
    const svc = serviceFromQuery(text);
    if (svc) {
      setServiceId(svc.id);
      setQuery('');
    } else {
      setQuery(text.trim());
    }
  };

  const service = services.find((s) => s.id === serviceId);
  const clearAll = () => { setQuery(''); setInput(''); setServiceId(null); };

  return (
    <Screen>
      <BackButton />
      <View style={{ marginTop: space.s }}>
        <SearchField
          value={input}
          onChangeText={(v) => { setInput(v); if (!v) setQuery(''); }}
          onSubmit={submit}
          label="Buscar negocio, servicio o colonia"
          placeholder="Negocio, servicio o colonia"
        />
      </View>

      <ServiceFilters selected={serviceId} onSelect={setServiceId} />

      {params.estado === 'cargando' ? (
        <ResultsSkeleton />
      ) : results.length === 0 ? (
        <EmptyResults query={query} service={service} onClearService={() => setServiceId(null)} onClearAll={clearAll} onPickService={(id: string) => { setQuery(''); setInput(''); setServiceId(id); }} />
      ) : (
        <>
          <Txt variant="heading" accessibilityRole="header" accessibilityLiveRegion="polite" style={{ marginTop: space.xl }}>
            {headline(results.length, query, service)}
          </Txt>
          <Txt variant="small" style={{ marginTop: space.xs }}>Ordenados por nombre</Txt>
          <View style={styles.list}>
            {results.map((b) => (
              <ResultRow key={b.id} branch={b} service={service} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function headline(count: number, query: string, service: Service | null | undefined) {
  const places = `${count} ${count === 1 ? 'lugar' : 'lugares'}`;
  const verb = count === 1 ? 'hace' : 'hacen';
  if (service && query) return `${places} en “${query}” ${verb} ${service.name.toLowerCase()}`;
  if (service) return `${places} ${verb} ${service.name.toLowerCase()}`;
  if (query) return `${places} para “${query}”`;
  return `${places} en San Luis Río Colorado`;
}

function ServiceFilters({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const options = [{ id: null, name: 'Todos' }, ...services];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filters}
      contentContainerStyle={styles.filtersContent}
      accessibilityRole="tablist"
    >
      {options.map((o) => {
        const active = o.id === selected;
        return (
          <Pressable
            key={o.id ?? 'todos'}
            onPress={() => onSelect(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.filter}
          >
            <Txt style={[styles.filterText, active && styles.filterTextActive]}>{o.name}</Txt>
            <View style={[styles.filterBar, active && styles.filterBarActive]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ResultRow({ branch, service }: { branch: Branch; service: Service | null | undefined }) {
  const status = openStatus(branch);
  const offered = service && branch.services.find((s) => s.id === service.id);
  return (
    <Pressable
      onPress={() => router.push(`/sucursal/${branch.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${branch.name}, ${branch.neighborhood}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <Cover branch={branch} height={THUMB} style={{ width: THUMB }} />
      <View style={styles.rowBody}>
        <Txt variant="heading" numberOfLines={2}>{branch.name}</Txt>
        <Txt variant="small">{branch.address}, {branch.neighborhood}</Txt>
        <RatingLine branch={branch} />
        <Txt variant="small" style={{ color: status.open ? color.ink : color.inkSoft, fontFamily: font.bodyMedium }}>{status.label}</Txt>
        <Txt variant="label" numeric style={{ marginTop: space.xs }}>
          {offered ? `${offered.name}, ${minutes(offered.minutes)}: ${money(offered.price)}` : `Desde ${money(priceFrom(branch))}`}
        </Txt>
      </View>
    </Pressable>
  );
}

function EmptyResults({ query, service, onClearService, onClearAll, onPickService }: { query: string; service: Service | null | undefined; onClearService: () => void; onClearAll: () => void; onPickService: (id: string) => void }) {
  const suggestions = services.filter((s) => s.id !== service?.id).slice(0, 4);
  return (
    <View style={{ marginTop: space.xxl }} accessibilityLiveRegion="polite">
      <Txt variant="title" accessibilityRole="header">
        {query && service
          ? `Nadie en “${query}” hace ${service.name.toLowerCase()} todavía`
          : `No encontramos “${query || service?.name}” en San Luis Río Colorado`}
      </Txt>
      <Txt variant="bodySoft" style={{ marginTop: space.s }}>
        {query && service
          ? `Quita el filtro de ${service.name.toLowerCase()} para ver qué más hay en esa zona, o busca el servicio en toda la ciudad.`
          : 'Puede que ningún negocio de SNIPP lo ofrezca o que tenga otro nombre. Busca por servicio, por nombre del negocio o por colonia.'}
      </Txt>

      {query && service ? (
        <View style={{ marginTop: space.xl, gap: space.s }}>
          <Button variant="secondary" label={`Quitar el filtro de ${service.name.toLowerCase()}`} onPress={onClearService} />
        </View>
      ) : (
        <>
          <Txt variant="label" style={{ marginTop: space.xl }}>Servicios que sí hay en SNIPP</Txt>
          <View style={{ marginTop: space.xs }}>
            {suggestions.map((s) => (
              <Pressable key={s.id} onPress={() => onPickService(s.id)} accessibilityRole="button" style={styles.suggestion}>
                <Txt variant="body" style={{ textDecorationLine: 'underline', textDecorationColor: color.inkSoft }}>{s.name}</Txt>
                <Txt variant="bodySoft" numeric>desde {money(s.price)}</Txt>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Button variant="link" label={`Ver los ${visibleBranches().length} negocios`} onPress={onClearAll} style={{ marginTop: space.l }} />
    </View>
  );
}

function ResultsSkeleton() {
  return (
    <View accessible accessibilityLabel="Buscando">
      <Skeleton width="70%" height={22} style={{ marginTop: space.xl }} />
      <View style={styles.list}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.row}>
            <Skeleton width={THUMB} height={THUMB} radius={16} />
            <View style={[styles.rowBody, { gap: space.s }]}>
              <Skeleton width="80%" height={20} />
              <Skeleton width="60%" height={14} />
              <Skeleton width="50%" height={14} />
              <Skeleton width="40%" height={14} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { marginTop: space.l, marginHorizontal: -space.xl },
  filtersContent: { paddingHorizontal: space.xl, gap: space.xl },
  filter: { minHeight: touch, justifyContent: 'flex-end' },
  filterText: { fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: color.inkSoft, paddingBottom: space.s },
  filterTextActive: { fontFamily: font.bodySemi, color: color.ink },
  filterBar: { height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  filterBarActive: { backgroundColor: color.ink },
  list: { marginTop: space.l, gap: space.xl },
  row: { flexDirection: 'row', gap: space.l, alignItems: 'flex-start' },
  rowBody: { flex: 1, gap: 2 },
  suggestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: touch },
});
