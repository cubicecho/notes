import {
  LoadState as CubeuiLoadState,
  type LoadStateProps,
} from '@/components/load-state';

/** `Omit` over each arm of a union, where the plain one would merge the arms into one. */
type OmitEach<Props, Key extends PropertyKey> = Props extends unknown
  ? Omit<Props, Key>
  : never;

/** What `LoadState` reads off an Apollo `useQuery` result, or the notes context. */
export type ApolloLike = {
  loading: boolean;
  error?: unknown;
  /** What the query has to show. `undefined` while it has nothing yet. */
  data?: unknown;
  refetch: () => unknown;
};

/**
 * cubeui's `LoadState` over an Apollo result: failed, loading, or empty, and
 * nothing once there are rows.
 *
 * Pending and failed both mean *nothing to show*. Apollo keeps rendering what
 * it had while it refetches, and a refetch that fails with the last good list
 * still on screen leaves the list there rather than swapping it for an error.
 */
export function LoadState({
  query,
  ...props
}: OmitEach<LoadStateProps, 'query'> & { query: ApolloLike }) {
  const nothing = query.data === undefined;
  return (
    <CubeuiLoadState
      query={{
        isPending: query.loading && nothing,
        isError: query.error != null && nothing,
        error: query.error,
        refetch: () => {
          query.refetch();
        },
      }}
      {...props}
    />
  );
}
