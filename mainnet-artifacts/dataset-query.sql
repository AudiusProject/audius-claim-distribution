WITH "base_query" AS (
	select *
	from
	(
		select *,
			(
				(0.05 * least(data.num_saves_by_user, 100) / 100)
				+ (0.05 * least(data.num_reposts_by_user, 100) / 100)
				+ (0.05 * least(data.num_saves_of_users_playlists, 100) / 100)
				+ (0.75 * least(data.num_streams_of_users_tracks, 2500) / 2500)
				+ (0.1 * least(data.num_users_following_user, 1000) / 1000)
			)
			as score
		from (
			select
				users.user_id,
				coalesce(follower_counts.num_followers, 0) as num_users_following_user,
				coalesce(playlist_saves.num_saves, 0) as num_saves_of_users_playlists,
				coalesce(user_repost_counts.num_reposts_by_user, 0) as num_reposts_by_user,
				coalesce(user_save_counts.num_saves_by_user, 0) as num_saves_by_user,
				coalesce(user_content_play_counts.user_content_play_count, 0) as num_streams_of_users_tracks,
				users.handle, users.is_creator, users.is_verified, users.wallet, users.blocknumber, users.created_at, users.updated_at
			from users

			-- number of users that follow them
			left join
			(
				select followee_user_id, count(follower_user_id) as num_followers from follows where is_current = true and is_delete = false group by followee_user_id
			)
			as follower_counts
			on users.user_id = follower_counts.followee_user_id

			-- number of saves on their playlists/albums
			left join
			(
        -- select user_id, count(save_item_id) as num_saves from saves where save_type in ('playlist', 'album') and is_current = true and is_delete = false group by user_id
				select
          playlist_owner_id,
          count(save_user_id) as num_saves
        from
        (
					select playlists.playlist_id, playlists.playlist_owner_id, saves.user_id as save_user_id
					from playlists
					left join saves
					on playlists.playlist_id = saves.save_item_id
					where
						playlists.is_current = true and playlists.is_delete = false
						and saves.save_type in ('playlist', 'album')
						and saves.is_current = true and saves.is_delete = false
				)
				as playlist_saves
				group by playlist_owner_id
			)
			as playlist_saves
			on users.user_id = playlist_saves.playlist_owner_id

			-- number of plays on their non-deleted tracks
			left join
			(
				select
					tracks.owner_id as owner_id,
					sum(track_play_counts.track_play_count) as user_content_play_count
				from tracks
				left join
				(
					select
						plays.play_item_id as track_id,
						sum(plays.track_play_count) as track_play_count
					from
					(
						select
							play_item_id,
							count(id) as track_play_count
						from plays
						where play_item_id in (
							select track_id
							from tracks
							where is_current = true and is_delete = false
						) group by play_item_id
					)
					as plays
					group by plays.play_item_id
				)
				as track_play_counts
				on track_play_counts.track_id = tracks.track_id
				where tracks.is_current = true and tracks.is_delete = false
				group by tracks.owner_id
			)
			as user_content_play_counts
			on users.user_id = user_content_play_counts.owner_id

			-- number of reposts by user
			left join
			(
				select
					user_id, count(repost_item_id) as num_reposts_by_user
				from reposts
				where is_current = true and is_delete = false
				group by user_id
			)
			as user_repost_counts
			on users.user_id = user_repost_counts.user_id

			-- number of favorites by user
			left join
			(
				select
					user_id, count(save_item_id) as num_saves_by_user
				from saves
				where is_current = true and is_delete = false
				group by user_id
			)
			as user_save_counts
			on users.user_id = user_save_counts.user_id

			where users.is_current = true
			order by users.user_id asc
		)
		as data
	)
	as data2
	where data2.score >= 0.0058
)
SELECT *,
-- max blocknumber from query
( select max(max_bn_query.blocknumber) as max_blocknumber from "base_query" as max_bn_query ),
-- max created_at timestamp from query
( select max(max_created_at_query.created_at) as max_created_at from "base_query" as max_created_at_query )
FROM
(
	SELECT
		*,
		ROW_NUMBER() OVER (PARTITION BY wallet ORDER BY "tokens" DESC)
	FROM
	(
		select *,
			-- user's token number is proportional to their computed score from a total of 50mm tokens
			floor(data4.score / data4.total_score * 50000000) as tokens
		from
		(
			select *,
				-- compute total score as sum of all scorfes
				(
					select sum(data3.score) from "base_query"
					as data3
				)
				as total_score
			from "base_query"
			as data3
		)
		as data4
	)
	as data5
)
as data6
WHERE "row_number" = 1
order by created_at desc
;
